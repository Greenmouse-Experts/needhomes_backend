import { Module } from "@nestjs/common";
import { CloudinaryProvider } from "./provider/cloudinary";

@Module({
  providers: [CloudinaryProvider],
  exports: [CloudinaryProvider],
})
export class CloudinaryModule {}