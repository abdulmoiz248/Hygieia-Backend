import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common'
import { ClientProxy } from '@nestjs/microservices'
import { firstValueFrom } from 'rxjs'
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto'
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto'

@Controller('patient-journal')
export class PatientJournalController {
  constructor(
    @Inject('APPOINTMENTS_SERVICE') private readonly client: ClientProxy,
  ) {}

  @Post('entries')
  @HttpCode(HttpStatus.CREATED)
  async createEntry(@Body() createJournalEntryDto: CreateJournalEntryDto) {
    return await firstValueFrom(
      this.client.send({ cmd: 'create_journal_entry' }, createJournalEntryDto),
    )
  }

  @Get('entries/:patientId')
  async getPatientJournal(
    @Param('patientId') patientId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'get_patient_journal' },
        { patientId, page, limit },
      ),
    )
  }

  @Get('entries/:patientId/entry/:id')
  async getEntryById(@Param('id') id: string) {
    return await firstValueFrom(
      this.client.send({ cmd: 'get_journal_entry' }, id),
    )
  }

  @Put('entries/:id')
  async updateEntry(
    @Param('id') id: string,
    @Body() updateJournalEntryDto: UpdateJournalEntryDto,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'update_journal_entry' },
        { id, updateJournalEntryDto },
      ),
    )
  }

  @Delete('entries/:id')
  @HttpCode(HttpStatus.OK)
  async deleteEntry(@Param('id') id: string) {
    return await firstValueFrom(
      this.client.send({ cmd: 'delete_journal_entry' }, id),
    )
  }

  @Get('entries/:patientId/category/:category')
  async getEntriesByCategory(
    @Param('patientId') patientId: string,
    @Param('category') category: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'get_entries_by_category' },
        { patientId, category, page, limit },
      ),
    )
  }

  @Get('entries/:patientId/alert-level/:alertLevel')
  async getEntriesByAlertLevel(
    @Param('patientId') patientId: string,
    @Param('alertLevel') alertLevel: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'get_entries_by_alert_level' },
        { patientId, alertLevel, page, limit },
      ),
    )
  }

  @Get('entries/:patientId/date-range')
  async getDateRangeEntries(
    @Param('patientId') patientId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'get_date_range_entries' },
        {
          patientId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          page,
          limit,
        },
      ),
    )
  }

  @Get('entries/:patientId/search')
  async searchEntries(
    @Param('patientId') patientId: string,
    @Query('q') searchQuery: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return await firstValueFrom(
      this.client.send(
        { cmd: 'search_entries' },
        { patientId, searchQuery, page, limit },
      ),
    )
  }

  @Get('entries/:patientId/statistics')
  async getStatistics(@Param('patientId') patientId: string) {
    return await firstValueFrom(
      this.client.send({ cmd: 'get_statistics' }, patientId),
    )
  }
}
