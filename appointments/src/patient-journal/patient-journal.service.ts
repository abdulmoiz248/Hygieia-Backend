import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { PatientJournal, PatientJournalDocument } from './schema/patient-journal.schema'
import { CreateJournalEntryDto } from './dto/create-journal-entry.dto'
import { UpdateJournalEntryDto } from './dto/update-journal-entry.dto'

@Injectable()
export class PatientJournalService {
  constructor(
    @InjectModel(PatientJournal.name)
    private journalModel: Model<PatientJournalDocument>,
  ) {}

  async createEntry(
    createJournalEntryDto: CreateJournalEntryDto,
  ): Promise<PatientJournalDocument> {
    try {
      if (!createJournalEntryDto.patientId || !createJournalEntryDto.message) {
        throw new BadRequestException(
          'Patient ID and message are required',
        )
      }

      const newEntry = new this.journalModel({
        ...createJournalEntryDto,
        entryDate: createJournalEntryDto.entryDate || new Date(),
      })

      return await newEntry.save()
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException(`Failed to create journal entry: ${error.message}`)
    }
  }

  async getPatientJournal(
    patientId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: PatientJournalDocument[]; total: number; pages: number }> {
    try {
      if (!patientId) {
        throw new BadRequestException('Patient ID is required')
      }

      const skip = (page - 1) * limit
      const entries = await this.journalModel
        .find({ patientId })
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit)

      const total = await this.journalModel.countDocuments({ patientId })
      const pages = Math.ceil(total / limit)

      return { entries, total, pages }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error
      }
      throw new BadRequestException(`Failed to fetch journal: ${error.message}`)
    }
  }

  async getEntryById(id: string): Promise<PatientJournalDocument> {
    try {
      const entry = await this.journalModel.findById(id)
      if (!entry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`)
      }
      return entry
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException(`Failed to fetch entry: ${error.message}`)
    }
  }

  async updateEntry(
    id: string,
    updateJournalEntryDto: UpdateJournalEntryDto,
  ): Promise<PatientJournalDocument> {
    try {
      const entry = await this.journalModel.findByIdAndUpdate(
        id,
        { ...updateJournalEntryDto, updatedAt: new Date() },
        { new: true, runValidators: true },
      )

      if (!entry) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`)
      }

      return entry
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException(`Failed to update entry: ${error.message}`)
    }
  }

  async deleteEntry(id: string): Promise<{ message: string }> {
    try {
      const result = await this.journalModel.findByIdAndDelete(id)
      if (!result) {
        throw new NotFoundException(`Journal entry with ID ${id} not found`)
      }
      return { message: 'Journal entry deleted successfully' }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error
      }
      throw new BadRequestException(`Failed to delete entry: ${error.message}`)
    }
  }

  async getEntriesByCategory(
    patientId: string,
    category: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: PatientJournalDocument[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit
      const entries = await this.journalModel
        .find({ patientId, categories: category })
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit)

      const total = await this.journalModel.countDocuments({
        patientId,
        categories: category,
      })
      const pages = Math.ceil(total / limit)

      return { entries, total, pages }
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch entries by category: ${error.message}`,
      )
    }
  }

  async getEntriesByAlertLevel(
    patientId: string,
    alertLevel: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: PatientJournalDocument[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit
      const entries = await this.journalModel
        .find({ patientId, alertLevel })
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit)

      const total = await this.journalModel.countDocuments({
        patientId,
        alertLevel,
      })
      const pages = Math.ceil(total / limit)

      return { entries, total, pages }
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch entries by alert level: ${error.message}`,
      )
    }
  }

  async getDateRangeEntries(
    patientId: string,
    startDate: Date,
    endDate: Date,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: PatientJournalDocument[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit
      const entries = await this.journalModel
        .find({
          patientId,
          entryDate: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit)

      const total = await this.journalModel.countDocuments({
        patientId,
        entryDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      })
      const pages = Math.ceil(total / limit)

      return { entries, total, pages }
    } catch (error) {
      throw new BadRequestException(
        `Failed to fetch entries by date range: ${error.message}`,
      )
    }
  }

  async searchEntries(
    patientId: string,
    searchQuery: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ entries: PatientJournalDocument[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit
      const searchRegex = new RegExp(searchQuery, 'i')

      const entries = await this.journalModel
        .find({
          patientId,
          $or: [
            { message: searchRegex },
            { tags: searchRegex },
          ],
        })
        .sort({ entryDate: -1 })
        .skip(skip)
        .limit(limit)

      const total = await this.journalModel.countDocuments({
        patientId,
        $or: [
          { message: searchRegex },
          { tags: searchRegex },
        ],
      })
      const pages = Math.ceil(total / limit)

      return { entries, total, pages }
    } catch (error) {
      throw new BadRequestException(
        `Failed to search entries: ${error.message}`,
      )
    }
  }

  async getStatistics(patientId: string): Promise<{
    totalEntries: number
    entriesByCategory: Record<string, number>
    entriesByAlertLevel: Record<string, number>
    lastEntryDate: Date | null
  }> {
    try {
      const entries = await this.journalModel.find({ patientId })

      const entriesByCategory: Record<string, number> = {}
      const entriesByAlertLevel: Record<string, number> = {}

      entries.forEach((entry) => {
        entry.categories.forEach((category) => {
          entriesByCategory[category] = (entriesByCategory[category] || 0) + 1
        })
        entriesByAlertLevel[entry.alertLevel] =
          (entriesByAlertLevel[entry.alertLevel] || 0) + 1
      })

      const lastEntry = entries.sort(
        (a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime(),
      )[0]

      return {
        totalEntries: entries.length,
        entriesByCategory,
        entriesByAlertLevel,
        lastEntryDate: lastEntry?.entryDate || null,
      }
    } catch (error) {
      throw new BadRequestException(
        `Failed to calculate statistics: ${error.message}`,
      )
    }
  }
}
