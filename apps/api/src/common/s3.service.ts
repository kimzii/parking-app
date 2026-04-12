import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const bucket = this.configService.get<string>('AWS_S3_BUCKET');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS environment variables are not configured properly');
    }

    this.region = region;
    this.bucket = bucket;
    this.s3 = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  /** Slugify a name for use in S3 keys */
  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /** Build the public URL for an S3 key */
  buildUrl(key: string, cacheBust = false): string {
    const url = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    return cacheBust ? `${url}?t=${Date.now()}` : url;
  }

  /** Extract the S3 key from a full URL */
  extractKey(url: string): string | null {
    const prefix = `https://${this.bucket}.s3.${this.region}.amazonaws.com/`;
    if (!url.startsWith(prefix)) return null;
    // Strip query params (e.g. ?t=timestamp)
    return url.slice(prefix.length).split('?')[0];
  }

  /** Upload a file and return its public URL */
  async upload(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<string> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
    return this.buildUrl(key);
  }

  /** Delete a single object by key */
  async delete(key: string): Promise<void> {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  /** Delete a single object by its full URL */
  async deleteByUrl(url: string): Promise<void> {
    const key = this.extractKey(url);
    if (key) {
      await this.delete(key);
    }
  }

  /** Delete multiple objects by their full URLs */
  async deleteByUrls(urls: string[]): Promise<void> {
    const keys = urls
      .map((url) => this.extractKey(url))
      .filter((k): k is string => k !== null);

    if (keys.length === 0) return;

    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucket,
        Delete: {
          Objects: keys.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }

  // ── Key generators with consistent naming ──

  /** parking-images/{location-name}-1.jpg */
  parkingImageKey(locationName: string, index: number, ext: string): string {
    return `parking-images/${this.slugify(locationName)}-${index + 1}.${ext}`;
  }

  /** proof-of-residence/{location-name}.jpg */
  proofOfResidenceKey(locationName: string, ext: string): string {
    return `proof-of-residence/${this.slugify(locationName)}.${ext}`;
  }

  /** profile-pictures/{user-name}.jpg */
  profilePictureKey(userName: string, ext: string): string {
    return `profile-pictures/${this.slugify(userName)}.${ext}`;
  }

  /** driver-licenses/{user-name}.jpg */
  driverLicenseKey(userName: string, ext: string): string {
    return `driver-licenses/${this.slugify(userName)}.${ext}`;
  }

  /** vehicle-registrations/{plate-number}.jpg */
  vehicleRegistrationKey(plateNumber: string, ext: string): string {
    return `vehicle-registrations/${this.slugify(plateNumber)}.${ext}`;
  }
}
