import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { CloudinaryService } from './multimedia.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@Controller('multimedia')
export class MultimediaController {
    // Controller methods would go here
    constructor(private readonly cloudinaryService: CloudinaryService) {}

    @UseGuards(JwtAuthGuard)
    @Post('upload')
    @UseInterceptors(
        FileInterceptor('file', {
            limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
        })
    )
    async uploadFile(
        @CurrentUser('id') userId: string,
        @UploadedFile() file: Express.Multer.File
    )
         {
        const result = await this.cloudinaryService.uploadFile(file, userId);

        return {
            message: "File uploaded successfully",
            url: result.url,
            publicId: result.publicId,
        };
    }



}
