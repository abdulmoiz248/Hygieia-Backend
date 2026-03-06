// src/blogpost/blogpost.service.ts
import { Injectable } from '@nestjs/common'
import { SupabaseClient, createClient } from '@supabase/supabase-js'
import { CreateBlogPostDto, UpdateBlogPostDto } from './dto/createBlogPost.dto'
import { ConfigService } from '@nestjs/config'
import { v2 as cloudinary } from 'cloudinary'

@Injectable()
export class BlogPostService {
  private readonly supabase: SupabaseClient
  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    })

    console.log('✅ Supabase and Cloudinary configured successfully')
  }

  private async uploadImage(base64: string) {
    console.log('⬆️ Uploading image to Cloudinary...')
    const res = await cloudinary.uploader.upload(`data:image/png;base64,${base64}`, { folder: 'blog' })
    console.log('✅ Image uploaded:', res.secure_url)
    return res.secure_url
  }

  async findAll() {
    console.log('📌 Fetching all blog posts...')
    const { data, error } = await this.supabase.from('blogpost').select('*')
    if (error) {
      console.error('❌ Error fetching blog posts:', error)
      return { success: false, error }
    }
    console.log('✅ Found blog posts')
    return { success: true, data }
  }

  async findOne(id: string) {
    console.log(`📌 Fetching blog post with id: ${id}`)
    const { data, error } = await this.supabase.from('blogpost').select('*').eq('id', id).single()
    if (error) {
      console.error('❌ Error fetching blog post:', error)
      return { success: false, error }
    }
    console.log('✅ Found blog post:', data)
    return { success: true, data }
  }

  async remove(id: string) {
    console.log(`🗑️ Removing blog post with id: ${id}`)
    const { data, error } = await this.supabase.from('blogpost').delete().eq('id', id).select()
    if (error) {
      console.error('❌ Error removing blog post:', error)
      return { success: false, error }
    }
    console.log('✅ Blog post removed:', data)
    return { success: true, data }
  }


 
  async findByDoctor(doctorId: string) {
  console.log(`📌 Fetching blog posts for doctor with id: ${doctorId}`)
  const { data, error } = await this.supabase
    .from('blogpost')
    .select('*')
    .eq('doctorId', doctorId)

  if (error) {
    console.error('❌ Error fetching doctor blog posts:', error)
    return { success: false, error }
  }

  console.log('✅ Found blog posts for doctor:', data)
  return { success: true, data }
}

async create(dto: CreateBlogPostDto & { image?: string | null }) {
  console.log('📝 Creating blog post with DTO:', dto)
  let imageUrl: string | null = null
  if (dto.image) {
    console.log('📷 Image detected, uploading...')
    imageUrl = await this.uploadImage(dto.image)
  }

  let tags:any = []
  if (dto.tags) {
    if (typeof dto.tags === 'string') {
      try {
        tags = JSON.parse(dto.tags)
      } catch {
        tags = []
      }
    } else {
      tags = dto.tags
    }
  }

  const { data, error } = await this.supabase.from('blogpost').insert({
    ...dto,
    image: imageUrl,
    doctorId: dto.doctorId,
    tags,
  }).select()

  if (error) {
    console.error('❌ Error creating blog post:', error)
    return { success: false, error }
  }
  console.log('✅ Blog post created:', data)
  return { success: true, data }
}

async update(id: string, dto: UpdateBlogPostDto & { image?: string | null }) {
  console.log(`✏️ Updating blog post with id: ${id}`, dto)
  let imageUrl: string | null = null
  if (dto.image) {
    console.log('📷 New image detected, uploading...')
    imageUrl = await this.uploadImage(dto.image)
  }

  let tags:any = []
  if (dto.tags) {
    if (typeof dto.tags === 'string') {
      try {
        tags = JSON.parse(dto.tags)
      } catch {
        tags = []
      }
    } else {
      tags = dto.tags
    }
  }

  if(imageUrl)
 {
   const { data, error } = await this.supabase.from('blogpost').update({
    ...dto,
    image: imageUrl,
    doctorId: dto.doctorId,
    tags,
  }).eq('id', id).select()

  if (error) {
    console.error('❌ Error updating blog post:', error)
    return { success: false, error }
  }
  console.log('✅ Blog post updated:', data)
  return { success: true, data }
 }else{
  const { image, ...restData } = dto
   const { data, error } = await this.supabase.from('blogpost').update({
    ...restData,
  //  image: imageUrl,
    doctorId: dto.doctorId,
    tags,
  }).eq('id', id).select()

  if (error) {
    console.error('❌ Error updating blog post:', error)
    return { success: false, error }
  }
  console.log('✅ Blog post updated:', data)
  return { success: true, data }
 }
}


}
