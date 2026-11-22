import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { MediaService } from './media.service';
@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}
  @Public() @Get('config') config() {
    return {
      enabled: this.media.store.enabled(),
      maxPhotos: 5,
      maxBytes: 10485760,
    };
  }
  @Post('uploads') @ApiBearerAuth() intent(
    @CurrentUser() user: { id: string },
  ) {
    return this.media.intent(user.id);
  }
  @Put('uploads/:id/content')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 10485760, files: 1 } }),
  )
  upload(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.media.upload(id, user.id, file);
  }
  @Post('uploads/:id/complete') @ApiBearerAuth() complete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.media.complete(id, user.id);
  }
  @Public() @Get(':id') async read(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('variant') variant: string | undefined,
    @Res() res: Response,
  ) {
    const bytes = await this.media.read(id, variant === 'thumb');
    res.set({
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(bytes);
  }
}
