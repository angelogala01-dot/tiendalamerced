import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

describe('ProductsService', () => {
  let service: ProductsService;

  const categoryId = '11111111-1111-1111-1111-111111111111';
  const brandId = '22222222-2222-2222-2222-222222222222';

  function createMockSupabase(overrides?: {
    categorySlug?: string;
    brandSlug?: string;
    existingSkus?: string[];
  }) {
    const existingSkus = new Set(overrides?.existingSkus ?? []);

    const from = jest.fn((table: string) => {
      if (table === 'categories') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { slug: overrides?.categorySlug ?? 'alimentos' },
              }),
            }),
          }),
        };
      }

      if (table === 'brands') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { slug: overrides?.brandSlug ?? 'la-costena' },
              }),
            }),
          }),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((_col: string, sku: string) => ({
              maybeSingle: jest.fn().mockResolvedValue({
                data: existingSkus.has(sku) ? { id: 'taken' } : null,
              }),
              neq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: existingSkus.has(sku) ? { id: 'taken' } : null,
                }),
              }),
            })),
          }),
        };
      }

      return { select: jest.fn() };
    });

    return { from };
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: createMockSupabase(),
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'https://test.supabase.co' },
        },
      ],
    }).compile();

    service = module.get(ProductsService);
  });

  it('sugiere SKU con formato categoría-secuencia-marca', async () => {
    const result = await service.suggestSku(categoryId, brandId);
    expect(result.sku).toBe('ALIM-0001-LACO');
    expect(result.sequence).toBe(1);
  });

  it('incrementa secuencia si el SKU ya existe', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: SUPABASE_CLIENT,
          useValue: createMockSupabase({ existingSkus: ['ALIM-0001-LACO'] }),
        },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'https://test.supabase.co' },
        },
      ],
    }).compile();

    const svc = module.get(ProductsService);
    const result = await svc.suggestSku(categoryId, brandId);
    expect(result.sku).toBe('ALIM-0002-LACO');
    expect(result.sequence).toBe(2);
  });

  it('rechaza sugerencia sin categoría o marca', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'categories') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: null }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: { slug: 'marca' } }),
            }),
          }),
        };
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: SUPABASE_CLIENT, useValue: mockSupabase },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'https://test.supabase.co' },
        },
      ],
    }).compile();

    const svc = module.get(ProductsService);
    await expect(svc.suggestSku(categoryId, brandId)).rejects.toThrow(BadRequestException);
  });

  it('valida disponibilidad y formato de SKU', async () => {
    const invalid = await service.checkSkuAvailable('invalid');
    expect(invalid.available).toBe(false);
    expect(invalid.reason).toContain('Formato');

    const available = await service.checkSkuAvailable('ALIM-0001-LACO');
    expect(available.available).toBe(true);
    expect(available.sku).toBe('ALIM-0001-LACO');
  });
});
