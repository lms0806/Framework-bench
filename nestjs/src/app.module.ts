import { Body, Controller, Get, Header, HttpCode, Module, Post } from '@nestjs/common';
import fastJson from 'fast-json-stringify';

const stringifyItems = fastJson({
  type: 'array',
  items: {
    type: 'object',
    properties: { id: { type: 'integer' }, name: { type: 'string' }, value: { type: 'integer' } },
    required: ['id', 'name', 'value'],
  },
});
const stringifyAggregate = fastJson({
  type: 'object',
  properties: { count: { type: 'integer' }, sum: { type: 'integer' }, min: { type: 'integer' }, max: { type: 'integer' } },
  required: ['count', 'sum', 'min', 'max'],
});

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
  @Header('Content-Type', 'application/json; charset=utf-8')
  jsonLarge(): string {
    return stringifyItems(Array.from({ length: 100 }, (_, index) => {
      const id = index + 1;
      return { id, name: `item-${id}`, value: id * 10 };
    }));
  }

  @Post('aggregate')
  @HttpCode(200)
  @Header('Content-Type', 'application/json; charset=utf-8')
  aggregate(@Body() input: { numbers: number[] }): string {
    const numbers = input.numbers;
    return stringifyAggregate({
      count: numbers.length,
      sum: numbers.reduce((sum, value) => sum + value, 0),
      min: numbers.length ? Math.min(...numbers) : 0,
      max: numbers.length ? Math.max(...numbers) : 0,
    });
  }

  @Get('json')
  json(): { message: string } {
    return { message: 'Hello, World!' };
  }
}

@Module({ controllers: [AppController] })
export class AppModule {}
