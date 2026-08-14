import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const BUCKET = 'product-images';

@Injectable()
export class UploadService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {}

  validateImageFile(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se envió ningún archivo');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Formato no permitido. Use JPG, PNG o WEBP.');
    }
  }

  async uploadProductImage(file: Express.Multer.File) {
    this.validateImageFile(file);

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `products/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(`Error al subir imagen: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL').trim();
    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return {
      url: publicUrl || urlData.publicUrl,
      storage_path: storagePath,
    };
  }

  async uploadDeliveryPhoto(file: Express.Multer.File) {
    this.validateImageFile(file);

    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `deliveries/${randomUUID()}.${ext}`;

    const { error } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(`Error al subir foto: ${error.message}`);
    }

    const { data: urlData } = this.supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    const supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL').trim();
    const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${storagePath}`;

    return {
      url: publicUrl || urlData.publicUrl,
      storage_path: storagePath,
    };
  }

  async deleteProductImage(storagePath: string) {
    if (!storagePath || storagePath.includes('..')) {
      throw new BadRequestException('Ruta de almacenamiento inválida');
    }

    const { error } = await this.supabase.storage.from(BUCKET).remove([storagePath]);
    if (error) {
      throw new InternalServerErrorException(`Error al eliminar imagen: ${error.message}`);
    }

    await this.supabase.from('product_images').delete().eq('storage_path', storagePath);

    return { deleted: true };
  }
}
