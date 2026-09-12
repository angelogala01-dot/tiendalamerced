import {
  Controller,
  Delete,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CatalogAuth, OrdersAuth } from '../../common/decorators/staff-auth.decorator';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly service: UploadService) {}

  @Post('product-image')
  @CatalogAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  uploadProductImage(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadProductImage(file);
  }

  @Post('delivery-photo')
  @OrdersAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  uploadDeliveryPhoto(@UploadedFile() file: Express.Multer.File) {
    return this.service.uploadDeliveryPhoto(file);
  }

  @Delete('product-image')
  @CatalogAuth()
  deleteProductImage(@Query('path') path: string) {
    return this.service.deleteProductImage(path);
  }
}
