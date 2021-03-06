import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TelegrafModule, TelegrafService } from 'nestjs-telegraf';
import botConfig from './bot.config';
import { TelegrafConfigService } from './telegraf-config.service';
import { BotService } from './bot.service';

@Module({
  imports: [
    TelegrafModule.fromFactory({
      imports: [ConfigModule.forFeature(botConfig)],
      useClass: TelegrafConfigService,
    }),
  ],
  exports: [TelegrafModule],
  providers: [BotService],
})
export class BotModule implements OnModuleInit {
  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly telegrafService: TelegrafService,
  ) { }

  onModuleInit() {
    this.telegrafService.init(this.moduleRef);
    this.telegrafService.startPolling();
  }
}