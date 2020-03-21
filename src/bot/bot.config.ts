import { registerAs } from '@nestjs/config';

interface Config {
  token: string;
  AIRTABLE_API_KEY: string;
}

export default registerAs(
  'bot',
  (): Config => ({
    token: process.env.TELEGRAM_BOT_TOKEN,
    AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY,
  }),
);