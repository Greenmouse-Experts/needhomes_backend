import { Inject, Injectable } from '@nestjs/common';
import { v2 as Cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private cloudinary: typeof Cloudinary,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    userId: string,
  ): Promise<{ url: string; publicId: string }> {
    const folder = `needhomes/${userId}`;
    return new Promise((resolve, reject) => {
      const uploadStream = this.cloudinary.uploader.upload_stream(
        { folder },
        (error, result) => {
          if (error) return reject(error);

          if (!result) return reject(new Error('Upload failed: no result'));

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      Readable.from(file.buffer).pipe(uploadStream);
    });
  }
}