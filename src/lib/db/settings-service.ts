import { repositories } from './repositories';
import { SETTINGS_SINGLETON_ID, type AppSettings, type WeddingSettings } from '../models';

export async function updateAppSettings(changes: Partial<AppSettings>): Promise<void> {
  await repositories.appSettings.update(SETTINGS_SINGLETON_ID, changes);
}

export async function updateWeddingSettings(changes: Partial<WeddingSettings>): Promise<void> {
  await repositories.weddingSettings.update(SETTINGS_SINGLETON_ID, changes);
}
