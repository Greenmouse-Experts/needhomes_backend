import { Module } from "@nestjs/common";
import { CloudinaryProvider } from "./provider/cloudinary";
import { MultimediaController } from './multimedia.controller';
import { CloudinaryService } from './multimedia.service';

@Module({
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryProvider, CloudinaryService],
  controllers: [MultimediaController],
})
export class MultimediaModule {}