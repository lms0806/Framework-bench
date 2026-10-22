import { Controller, Get, Header, Module } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  health(): string {
    return 'OK';
  }

  @Get('plaintext')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  plaintext(): string {
    return 'Hello, World!';
  }

  @Get('json')
  json(): { message: string } {
    return { message: 'Hello, World!' };
  }
}

@Module({ controllers: [AppController] })
export class AppModule {}
