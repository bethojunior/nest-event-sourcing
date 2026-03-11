import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { IUserModelEvent } from 'src/@types/events/user';

@Controller()
export class UserEventsController {
  @EventPattern('user.created')
  async handleUserCreated(@Payload() props: IUserModelEvent) {
    console.log('📧 Enviando email para', props.email);
  }
}
