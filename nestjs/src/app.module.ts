import { Body, Controller, Get, Header, HttpCode, Module, Post } from '@nestjs/common';

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

  @Get('json-large')
  jsonLarge(): { id: number; name: string; value: number }[] {
    return Array.from({ length: 100 }, (_, index) => {
      const id = index + 1;
      return { id, name: `item-${id}`, value: id * 10 };
    });
  }

  @Post('aggregate')
  @HttpCode(200)
  aggregate(@Body() input: { numbers: number[] }): { count: number; sum: number; min: number; max: number } {
    const numbers = input.numbers;
    return {
      count: numbers.length,
      sum: numbers.reduce((sum, value) => sum + value, 0),
      min: numbers.length ? Math.min(...numbers) : 0,
      max: numbers.length ? Math.max(...numbers) : 0,
    };
  }

  @Get('json')
  json(): { message: string } {
    return { message: 'Hello, World!' };
  }
}

@Module({ controllers: [AppController] })
export class AppModule {}
