import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

describe('UploadService', () => {
  let service: UploadService;

  const mockSupabase = {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        remove: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } }),
      }),
    },
    from: jest.fn().mockReturnValue({
      delete: jest.fn().mockReturnValue({ error: null }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
        { provide: ConfigService, useValue: { getOrThrow: () => 'https://test.supabase.co' } },
      ],
    }).compile();

    service = module.get(UploadService);
  });

  it('rechaza archivos sin contenido', () => {
    expect(() => service.validateImageFile(undefined as unknown as Express.Multer.File)).toThrow(
      BadRequestException,
    );
  });

  it('rechaza MIME no permitido', () => {
    expect(() =>
      service.validateImageFile({
        mimetype: 'application/pdf',
        size: 1000,
      } as Express.Multer.File),
    ).toThrow(BadRequestException);
  });

  it('acepta archivos grandes (sin límite de tamaño en app)', () => {
    expect(() =>
      service.validateImageFile({
        mimetype: 'image/jpeg',
        size: 50 * 1024 * 1024,
      } as Express.Multer.File),
    ).not.toThrow();
  });

  it('sube imagen válida', async () => {
    const result = await service.uploadProductImage({
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File);
    expect(result.url).toContain('https://test.supabase.co/storage/v1/object/public/product-images/');
    expect(result.storage_path).toContain('products/');
  });
});
