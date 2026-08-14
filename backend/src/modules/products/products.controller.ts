import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { ProductsService } from './products.service';
import {
  AddProductImageDto,
  CreateProductDto,
  UpdateProductDto,
  UpdateProductImageDto,
} from './dto/product.dto';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'brandId', required: false })
  @ApiQuery({ name: 'lite', required: false })
  @ApiQuery({ name: 'active', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('lite') lite?: string,
    @Query('active') active?: string,
  ) {
    return this.productsService.findAll({
      search,
      categoryId,
      brandId,
      page,
      limit,
      lite: lite === 'true' || lite === '1',
      activeOnly: active === 'true' || active === '1',
    });
  }

  @Get('suggest-sku')
  @StaffAuth()
  @ApiQuery({ name: 'categoryId', required: true })
  @ApiQuery({ name: 'brandId', required: true })
  @ApiQuery({ name: 'excludeId', required: false })
  suggestSku(
    @Query('categoryId') categoryId: string,
    @Query('brandId') brandId: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.productsService.suggestSku(categoryId, brandId, excludeId);
  }

  @Get('check-sku')
  @StaffAuth()
  @ApiQuery({ name: 'sku', required: true })
  @ApiQuery({ name: 'excludeId', required: false })
  checkSku(@Query('sku') sku: string, @Query('excludeId') excludeId?: string) {
    return this.productsService.checkSkuAvailable(sku, excludeId);
  }

  @Get('low-stock')
  @StaffAuth()
  getLowStock() {
    return this.productsService.getLowStock();
  }

  @Get('lookup')
  @StaffAuth()
  @ApiQuery({ name: 'code', required: true })
  lookup(@Query('code') code: string) {
    return this.productsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @StaffAuth()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  @StaffAuth()
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @StaffAuth()
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @Post(':id/images')
  @StaffAuth()
  addImage(@Param('id') id: string, @Body() dto: AddProductImageDto) {
    return this.productsService.addImage(id, dto);
  }

  @Patch(':id/images/:imageId')
  @StaffAuth()
  updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Body() dto: UpdateProductImageDto,
  ) {
    return this.productsService.updateImage(id, imageId, dto);
  }

  @Delete(':id/images/:imageId')
  @StaffAuth()
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.productsService.removeImage(id, imageId);
  }
}
