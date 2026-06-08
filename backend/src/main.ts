import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for cross-origin socket connections
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const PORT = process.env.PORT || 3000;
  
  console.log(`\n---------------------------------------------------`);
  console.log(`🚀 Doodle Reminders NestJS Backend Bootstrapping...`);
  console.log(`📁 Connecting to MongoDB...`);
  
  await app.listen(PORT);
  
  console.log(`✨ NestJS Server listening on port ${PORT}`);
  console.log(`⚡ WebSocket Gateways mapped successfully!`);
  console.log(`---------------------------------------------------\n`);
}

bootstrap().catch((err) => {
  console.error('\n❌ Fatal NestJS Server Boot Exception:', err.message);
  console.log('\n--- Troubleshooting ---');
  console.log('1. Ensure MongoDB is running locally (default: mongodb://127.0.0.1:27017/doodle-reminders)');
  console.log('   Run: docker run -d --name reminder-mongo -p 27017:27017 mongo:latest');
  console.log('2. Or, configure a custom MONGO_URI in a .env file.');
  console.log('------------------------\n');
  process.exit(1);
});
