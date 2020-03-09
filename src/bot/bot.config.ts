import { registerAs } from '@nestjs/config';

interface Config {
  token: string;
}

export default registerAs(
  'bot',
  (): Config => ({
    token: '1089338339:AAEDA-efvdZc4b8ezmH5yMlHWBOYPw8lREw', //process.env.TELEGRAM_BOT_TOKEN,
  }),
);