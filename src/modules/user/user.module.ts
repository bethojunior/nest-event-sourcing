import { Module } from '@nestjs/common';
import { EventBusModule } from '../../common/event-bus/event-bus.module';
import { UserEventsController } from './events/user-events.controller';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [EventBusModule],
  controllers: [UserController, UserEventsController],
  providers: [UserService],
})
export class UserModule {}
