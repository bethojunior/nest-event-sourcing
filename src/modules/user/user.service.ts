import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IUserModelEvent } from 'src/@types/events/user';
import { EventBusService } from '../../common/event-bus/event-bus.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
  constructor(private eventBus: EventBusService) {}

  async createUser(props: CreateUserDto) {
    const user: IUserModelEvent = {
      id: randomUUID(),
      name: props.name,
      phone: props.phone,
      email: props.email,
    };

    await this.eventBus.emit('user.created', user);

    return user;
  }
}
