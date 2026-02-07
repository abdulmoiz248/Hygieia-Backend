import { Inject, Injectable, NotFoundException, BadRequestException, ConflictException, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { UploadApiResponse, v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'
import { CreateCvDto } from './dto/create-cv.dto'
import { UpdateCvDto } from './dto/update-cv.dto'
import { MailerService } from 'src/mailer-service/mailer-service.service'
import { ClientProxy } from '@nestjs/microservices/client/client-proxy'
import axios from 'axios'

@Injectable()
export class CvService {
  private readonly supabase: SupabaseClient

  constructor(private configService: ConfigService,
    private mailer: MailerService,
       @Inject('MAILER_SERVICE') private readonly mailerClient: ClientProxy,
  ) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })
    console.log('[CV MS] CvService initialized')
  }

 async create(dto: CreateCvDto, file?: { buffer: string; mimetype: string }) {
  console.log('[CV MS] create called with dto:', dto)

  try {
    // step 1: check if email already exists
    const { data: existing, error: checkError } = await this.supabase
      .from('cv')
      .select('id')
      .eq('email', dto.email)
      .maybeSingle()

    if (checkError) {
      console.error('[CV MS] error checking for existing email:', checkError)
      throw new InternalServerErrorException('Failed to validate email uniqueness')
    }

    if (existing) {
      console.warn('[CV MS] email already exists:', dto.email)
      throw new ConflictException('A CV with this email already exists')
    }

    // step 2: upload file if present
    let cvLink: string | null = null
    if (file) {
      console.log('[CV MS] uploading file to Cloudinary...')
      try {
        const buffer = Buffer.from(file.buffer, 'base64')
        cvLink = await this.uploadCvFile(buffer, file.mimetype)
        console.log('[CV MS] file uploaded, cvLink:', cvLink)
      } catch (uploadError) {
        console.error('[CV MS] file upload failed:', uploadError)
        throw new InternalServerErrorException('Failed to upload CV file')
      }
    }

    // step 3: insert into supabase
    const insertPayload = { ...dto, cvLink }
    console.log('[CV MS] inserting into Supabase:', insertPayload)

    const { data, error } = await this.supabase
      .from('cv')
      .insert([insertPayload])
      .select()
      .single()

    if (error) {
      console.error('[CV MS] Supabase insert error:', error)
      throw new InternalServerErrorException('Failed to save CV to database')
    }

    console.log('[CV MS] insert success:', data)

    // step 4: emit mailer event
    this.mailerClient.emit('cv-received', { email: dto.email })

    // step 5: send to embeddings service if CV was uploaded
    if (cvLink) {
      try {
        const embeddingsServiceUrl = this.configService.get<string>('EMBEDDINGS_SERVICE_URL') || 'http://localhost:4008'
        console.log('[CV MS] sending CV to embeddings service:', embeddingsServiceUrl)
        
        await axios.post(`${embeddingsServiceUrl}/cv/generate-embeddings`, {
          cv_id: data.id,
          cv_url: cvLink,
          email: dto.email
        }, {
          timeout: 10000
        })
        
        console.log('[CV MS] embeddings generation initiated for CV:', data.id)
      } catch (embeddingError) {
        // Log error but don't fail the request
        console.error('[CV MS] failed to initiate embeddings generation:', embeddingError.message)
      }
    }

    return data
  } catch (error) {
    console.error('[CV MS] create error:', error)
    if (error instanceof BadRequestException || 
        error instanceof ConflictException || 
        error instanceof InternalServerErrorException) {
      throw error
    }
    throw new InternalServerErrorException('An unexpected error occurred while creating CV')
  }
}


  async update(id: string, dto: UpdateCvDto, file?: { buffer: string; mimetype: string }) {
    console.log('[CV MS] update called for id:', id, 'dto:', dto)

    try {
      // Check if CV exists
      const { data: existingCv, error: findError } = await this.supabase
        .from('cv')
        .select('*')
        .eq('id', id)
        .maybeSingle()

      if (findError) {
        console.error('[CV MS] error finding CV:', findError)
        throw new InternalServerErrorException('Failed to find CV')
      }

      if (!existingCv) {
        throw new NotFoundException('CV not found')
      }

      let cvLink: string | null = null

      if (file) {
        console.log('[CV MS] uploading new file to Cloudinary...')
        try {
          const buffer = Buffer.from(file.buffer, 'base64')
          cvLink = await this.uploadCvFile(buffer, file.mimetype)
          console.log('[CV MS] new file uploaded, cvLink:', cvLink)
        } catch (uploadError) {
          console.error('[CV MS] file upload failed:', uploadError)
          throw new InternalServerErrorException('Failed to upload CV file')
        }
      }

      const updatePayload: any = { ...dto }
      if (cvLink) updatePayload.cvLink = cvLink

      console.log('[CV MS] updating Supabase with payload:', updatePayload)

      const { data, error } = await this.supabase.from('cv').update(updatePayload).eq('id', id).select().single()
      if (error) {
        console.error('[CV MS] Supabase update error:', error)
        throw new InternalServerErrorException('Failed to update CV')
      }
      
      console.log('[CV MS] update success:', data)
      
      // Update embeddings if new CV file was uploaded
      if (cvLink) {
        try {
          const embeddingsServiceUrl = this.configService.get<string>('EMBEDDINGS_SERVICE_URL') || 'http://embeddings:4008'
          console.log('[CV MS] updating embeddings for CV:', id)
          
          await axios.post(`${embeddingsServiceUrl}/cv/generate-embeddings`, {
            cv_id: data.id,
            cv_url: cvLink,
            email: data.email
          }, {
            timeout: 10000
          })
          
          console.log('[CV MS] embeddings update initiated for CV:', data.id)
        } catch (embeddingError) {
          console.error('[CV MS] failed to update embeddings:', embeddingError.message)
        }
      }
      
      return data
    } catch (error) {
      console.error('[CV MS] update error:', error)
      if (error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error
      }
      throw new InternalServerErrorException('An unexpected error occurred while updating CV')
    }
  }

  private async uploadCvFile(fileBuffer: Buffer, mimeType: string): Promise<string> {
    console.log('[CV MS] uploadCvFile started, mimeType:', mimeType)

    const upload = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'cvs',
          resource_type: 'auto',
          format: mimeType === 'application/pdf' ? 'pdf' : undefined,
        },
        (err, result) => {
          if (err) {
            console.error('[CV MS] Cloudinary upload error:', err)
            return reject(err)
          }
          console.log('[CV MS] Cloudinary upload success:', result?.secure_url)
          resolve(result as UploadApiResponse)
        },
      )
      Readable.from(fileBuffer).pipe(stream)
    })

    return upload.secure_url
  }

  async findAll() {
    console.log('[CV MS] findAll called')
    try {
      const { data, error } = await this.supabase.from('cv').select('*')
      if (error) {
        console.error('[CV MS] Supabase findAll error:', error)
        throw new InternalServerErrorException('Failed to retrieve CVs')
      }
      console.log('[CV MS] findAll success, count:', data?.length)
      return data
    } catch (error) {
      console.error('[CV MS] findAll error:', error)
      if (error instanceof InternalServerErrorException) {
        throw error
      }
      throw new InternalServerErrorException('An unexpected error occurred while retrieving CVs')
    }
  }

  async findOne(id: string) {
    console.log('[CV MS] findOne called for id:', id)
    const { data, error } = await this.supabase.from('cv').select('*').eq('id', id).single()
    if (error || !data) {
      console.error('[CV MS] CV not found for id:', id)
      throw new NotFoundException('CV not found')
    }
    console.log('[CV MS] findOne success:', data)
    return data
  }

  async remove(id: string) {
    console.log('[CV MS] remove called for id:', id)
    try {
      const { data, error } = await this.supabase.from('cv').delete().eq('id', id).select().maybeSingle()
      if (error) {
        console.error('[CV MS] Supabase remove error:', error)
        throw new InternalServerErrorException('Failed to delete CV')
      }
      if (!data) {
        console.error('[CV MS] CV not found for deletion, id:', id)
        throw new NotFoundException('CV not found')
      }
      
      // Delete embeddings from embeddings service
      try {
        const embeddingsServiceUrl = this.configService.get<string>('EMBEDDINGS_SERVICE_URL') || 'http://embeddings:4008'
        await axios.delete(`${embeddingsServiceUrl}/cv/embeddings/${id}`, {
          timeout: 5000
        })
        console.log('[CV MS] embeddings deleted for CV:', id)
      } catch (embeddingError) {
        console.error('[CV MS] failed to delete embeddings:', embeddingError.message)
      }
      
      console.log('[CV MS] remove success for id:', id)
      return { message: 'CV deleted successfully' }
    } catch (error) {
      console.error('[CV MS] remove error:', error)
      if (error instanceof NotFoundException || 
          error instanceof InternalServerErrorException) {
        throw error
      }
      throw new InternalServerErrorException('An unexpected error occurred while deleting CV')
    }
  }





}
