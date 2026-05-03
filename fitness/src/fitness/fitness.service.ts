import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class FitnessService {
  private supabase: SupabaseClient;



  constructor(private configService: ConfigService) {

    this.supabase = createClient(
      this.configService.get<string>('SUPABASE_URL')!,
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }


  logger(msg: string) {
    console.log(msg)
  }

  async upsertFitnessRecord(userId: string, updates: any) {
    this.logger('[INFO FITNESS SERVICE] Processing daily fitness record');

    // Define "today"
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Check if a record already exists for today
    const { data: existingRows, error: fetchError } = await this.supabase
      .from('fitness')
      .select('id, created_at')
      .eq('patient_id', userId)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false });

    if (fetchError) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to check today's record: ${fetchError.message}`,
      );
      throw fetchError;
    }

    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    if (existing) {
      // Update today's record
      this.logger('[INFO FITNESS SERVICE] Updating today\'s record');
      const { data, error } = await this.supabase
        .from('fitness')
        .update(updates)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        this.logger(
          `[INFO FITNESS SERVICE] Failed to update record: ${error.message}`,
        );
        throw error;
      }

      this.logger('[INFO FITNESS SERVICE] Today\'s record updated successfully');
      return data;
    } else {
      // Insert a new record for today
      this.logger('[INFO FITNESS SERVICE] Adding new record for today');
      const { data, error } = await this.supabase
        .from('fitness')
        .insert([{ patient_id: userId, ...updates }])
        .select()
        .single();

      if (error) {
        this.logger(
          `[INFO FITNESS SERVICE] Failed to add record: ${error.message}`,
        );
        throw error;
      }

      this.logger('[INFO FITNESS SERVICE] New record created successfully');
      return data;
    }
  }

  async getFitnessRecords(userId: string) {
    this.logger('[INFO FITNESS SERVICE] Fetching fitness records');
    const { data, error } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to fetch records: ${error.message}`,
      );
      throw error;
    }

    this.logger('[INFO FITNESS SERVICE] Records fetched successfully');
    return data;
  }

  /**
   * Returns aggregated fitness stats for the past 12 months (365 days).
   * Includes:
   *   - daily raw rows
   *   - monthly aggregated summaries
   *   - weekly aggregated summaries
   *   - overall totals and averages
   */
  async getYearlyFitnessStats(userId: string) {
    this.logger('[INFO FITNESS SERVICE] Fetching yearly fitness stats');

    const now = new Date();
    const oneYearAgo = new Date(now);
    oneYearAgo.setFullYear(now.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const { data: rows, error } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .gte('created_at', oneYearAgo.toISOString())
      .lte('created_at', now.toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      this.logger(`[INFO FITNESS SERVICE] Failed to fetch yearly stats: ${error.message}`);
      throw error;
    }

    if (!rows || rows.length === 0) {
      this.logger('[INFO FITNESS SERVICE] No yearly data found, returning empty stats');
      return {
        period: { from: oneYearAgo.toISOString(), to: now.toISOString() },
        totalDays: 0,
        daily: [],
        weekly: [],
        monthly: [],
        totals: this._emptyTotals(),
        averages: this._emptyTotals(),
      };
    }

    // ---- helpers ----
    const numericFields = [
      'steps', 'water', 'sleep', 'calories_burned',
      'calories_intake', 'fat', 'protein', 'carbs', 'walk_calories_burned',
    ] as const;

    const sumRow = (acc: Record<string, number>, row: any) => {
      for (const f of numericFields) acc[f] = (acc[f] ?? 0) + Number(row[f] || 0);
      return acc;
    };

    const makeKey = (dateStr: string, mode: 'month' | 'week') => {
      const d = new Date(dateStr);
      if (mode === 'month') {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }
      // ISO week: Monday-based week number
      const tmp = new Date(d.valueOf());
      tmp.setHours(0, 0, 0, 0);
      tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
      const yearStart = new Date(tmp.getFullYear(), 0, 1);
      const weekNo = Math.ceil(((tmp.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
      return `${tmp.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
    };

    // ---- monthly ----
    const monthlyMap = new Map<string, { key: string; count: number } & Record<string, number>>();
    // ---- weekly ----
    const weeklyMap = new Map<string, { key: string; count: number } & Record<string, number>>();

    for (const row of rows) {
      const mKey = makeKey(row.created_at, 'month');
      const wKey = makeKey(row.created_at, 'week');

      // @ts-ignore
      if (!monthlyMap.has(mKey)) monthlyMap.set(mKey, { key: mKey, count: 0, ...this._emptyTotals() });
      // @ts-ignore
      if (!weeklyMap.has(wKey)) weeklyMap.set(wKey, { key: wKey, count: 0, ...this._emptyTotals() });

      const mEntry = monthlyMap.get(mKey)!;
      const wEntry = weeklyMap.get(wKey)!;
      mEntry.count += 1;
      wEntry.count += 1;
      sumRow(mEntry as any, row);
      sumRow(wEntry as any, row);
    }

    const buildAverages = (entry: any) => {
      const avg: Record<string, number> = {};
      for (const f of numericFields) avg[f] = entry.count > 0 ? Math.round((entry[f] / entry.count) * 100) / 100 : 0;
      return avg;
    };

    const monthly = Array.from(monthlyMap.values()).map((e) => ({
      month: e.key,
      totalDays: e.count,
      totals: Object.fromEntries(numericFields.map((f) => [f, e[f]])),
      averages: buildAverages(e),
    }));

    const weekly = Array.from(weeklyMap.values()).map((e) => ({
      week: e.key,
      totalDays: e.count,
      totals: Object.fromEntries(numericFields.map((f) => [f, e[f]])),
      averages: buildAverages(e),
    }));

    // ---- overall totals & averages ----
    const grandTotals = rows.reduce((acc, row) => sumRow(acc, row), this._emptyTotals());
    const totalDays = rows.length;
    const grandAverages: Record<string, number> = {};
    for (const f of numericFields) {
      grandAverages[f] = totalDays > 0 ? Math.round((grandTotals[f] / totalDays) * 100) / 100 : 0;
    }

    this.logger('[INFO FITNESS SERVICE] Yearly stats computed successfully');
    return {
      period: { from: oneYearAgo.toISOString(), to: now.toISOString() },
      totalDays,
      daily: rows,
      weekly,
      monthly,
      totals: grandTotals,
      averages: grandAverages,
    };
  }

  private _emptyTotals(): Record<string, number> {
    return {
      steps: 0, water: 0, sleep: 0,
      calories_burned: 0, calories_intake: 0,
      fat: 0, protein: 0, carbs: 0, walk_calories_burned: 0,
    };
  }

  async getTodayFitnessData(userId: string) {
    this.logger('[INFO FITNESS SERVICE] Fetching today\'s fitness data');

    // Get current date in Asia/Karachi timezone
    const now = new Date();
    const karachiTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Karachi' }));

    // Set to start of day in Karachi timezone
    const todayStart = new Date(karachiTime);
    todayStart.setHours(0, 0, 0, 0);

    // Set to end of day in Karachi timezone
    const todayEnd = new Date(karachiTime);
    todayEnd.setHours(23, 59, 59, 999);

    // Convert to UTC for database query
    const todayStartUTC = new Date(todayStart.toISOString());
    const todayEndUTC = new Date(todayEnd.toISOString());

    // Query all rows for today's window and aggregate in case duplicates exist
    const { data: todayRows, error } = await this.supabase
      .from('fitness')
      .select('*')
      .eq('patient_id', userId)
      .gte('created_at', todayStartUTC.toISOString())
      .lte('created_at', todayEndUTC.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      this.logger(
        `[INFO FITNESS SERVICE] Failed to fetch today's data: ${error.message}`,
      );
      throw error;
    }

    // Return default values if no record exists for today
    if (!todayRows || todayRows.length === 0) {
      this.logger('[INFO FITNESS SERVICE] No data for today, returning default values');
      return [{
        id: null,
        created_at: null,
        patient_id: userId,
        steps: 0,
        water: 0,
        sleep: 0,
        calories_burned: 0,
        calories_intake: 0,
        fat: 0,
        protein: 0,
        carbs: 0,
      }];
    }

    const totals = todayRows.reduce(
      (acc, row) => {
        acc.steps += Number(row.steps || 0);
        acc.water += Number(row.water || 0);
        acc.sleep += Number(row.sleep || 0);
        acc.calories_burned += Number(row.calories_burned || 0);
        acc.calories_intake += Number(row.calories_intake || 0);
        acc.fat += Number(row.fat || 0);
        acc.protein += Number(row.protein || 0);
        acc.carbs += Number(row.carbs || 0);
        acc.walk_calories_burned += Number(row.walk_calories_burned || 0);
        return acc;
      },
      {
        steps: 0,
        water: 0,
        sleep: 0,
        calories_burned: 0,
        calories_intake: 0,
        fat: 0,
        protein: 0,
        carbs: 0,
        walk_calories_burned: 0,
      },
    );

    const latest = todayRows[0];
    const merged = {
      ...latest,
      steps: totals.steps,
      water: totals.water,
      sleep: totals.sleep,
      calories_burned: totals.calories_burned + totals.walk_calories_burned,
      calories_intake: totals.calories_intake,
      fat: totals.fat,
      protein: totals.protein,
      carbs: totals.carbs,
      walk_calories_burned: totals.walk_calories_burned,
    };

    this.logger('[INFO FITNESS SERVICE] Today\'s data fetched successfully');
    return merged;
  }
}
