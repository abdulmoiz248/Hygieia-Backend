import { Controller } from '@nestjs/common'
import { MessagePattern, Payload } from '@nestjs/microservices'
import { PatientJournalService } from './patient-journal.service'
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto'
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto'

@Controller()
export class PatientJournalController {
  constructor(private readonly patientJournalService: PatientJournalService) {}

  @MessagePattern({ cmd: 'create_journal_entry' })
  async createEntry(@Payload() createJournalEntryDto: CreateJournalEntryDto) {
    return await this.patientJournalService.createEntry(createJournalEntryDto)
  }

  @MessagePattern({ cmd: 'get_patient_journal' })
  async getPatientJournal(@Payload() data: { patientId: string; page: number; limit: number }) {
    return await this.patientJournalService.getPatientJournal(
      data.patientId,
      data.page,
      data.limit,
    )
  }

  @MessagePattern({ cmd: 'get_journal_entry' })
  async getEntryById(@Payload() id: string) {
    return await this.patientJournalService.getEntryById(id)
  }

  @MessagePattern({ cmd: 'update_journal_entry' })
  async updateEntry(@Payload() data: { id: string; updateJournalEntryDto: UpdateJournalEntryDto }) {
    return await this.patientJournalService.updateEntry(data.id, data.updateJournalEntryDto)
  }

  @MessagePattern({ cmd: 'delete_journal_entry' })
  async deleteEntry(@Payload() id: string) {
    return await this.patientJournalService.deleteEntry(id)
  }

  @MessagePattern({ cmd: 'get_entries_by_category' })
  async getEntriesByCategory(@Payload() data: { patientId: string; category: string; page: number; limit: number }) {
    return await this.patientJournalService.getEntriesByCategory(
      data.patientId,
      data.category,
      data.page,
      data.limit,
    )
  }

  @MessagePattern({ cmd: 'get_entries_by_alert_level' })
  async getEntriesByAlertLevel(@Payload() data: { patientId: string; alertLevel: string; page: number; limit: number }) {
    return await this.patientJournalService.getEntriesByAlertLevel(
      data.patientId,
      data.alertLevel,
      data.page,
      data.limit,
    )
  }

  @MessagePattern({ cmd: 'get_date_range_entries' })
  async getDateRangeEntries(@Payload() data: { patientId: string; startDate: Date; endDate: Date; page: number; limit: number }) {
    return await this.patientJournalService.getDateRangeEntries(
      data.patientId,
      data.startDate,
      data.endDate,
      data.page,
      data.limit,
    )
  }

  @MessagePattern({ cmd: 'search_entries' })
  async searchEntries(@Payload() data: { patientId: string; searchQuery: string; page: number; limit: number }) {
    return await this.patientJournalService.searchEntries(
      data.patientId,
      data.searchQuery,
      data.page,
      data.limit,
    )
  }

  @MessagePattern({ cmd: 'get_statistics' })
  async getStatistics(@Payload() patientId: string) {
    return await this.patientJournalService.getStatistics(patientId)
  }
}
