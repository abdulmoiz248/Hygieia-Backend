import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { CvService } from './cv.service'
import { CreateCvDto } from './dto/create-cv.dto'
import { UpdateCvDto } from './dto/update-cv.dto'

@Controller()
export class CvController {
  constructor(private readonly cvService: CvService) {}

 
@MessagePattern({ cmd: 'create_cv' })
create(@Payload() payload: { dto: CreateCvDto; file?: { buffer: string; mimetype: string } }) {
  const { dto, file } = payload
  return this.cvService.create(dto, file)
}

@MessagePattern({ cmd: 'update_cv' })
update(@Payload() payload: { id: string; dto: UpdateCvDto; file?: { buffer: string; mimetype: string } }) {
  const { id, dto, file } = payload
  return this.cvService.update(id, dto, file)
}

  @MessagePattern({ cmd: 'find_all_cv' })
  findAll() {
    return this.cvService.findAll()
  }

  @MessagePattern({ cmd: 'find_one_cv' })
  findOne(@Payload() id: string) {
    return this.cvService.findOne(id)
  }

 

  @MessagePattern({ cmd: 'remove_cv' })
  remove(@Payload() id: string) {
    return this.cvService.remove(id)
  }

  @MessagePattern({ cmd: 'update_cv_status' })
  updateStatus(@Payload() payload: { id: string; status: 'new' | 'shortlisted' | 'reviewed' | 'rejected' }) {
    return this.cvService.updateStatus(payload.id, payload.status)
  }
}
