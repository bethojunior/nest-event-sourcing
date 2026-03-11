# NestJS Event Sourcing Boilerplate

Boilerplate completo para aplicações NestJS com arquitetura baseada em eventos (estilo **Event Sourcing**), utilizando **RabbitMQ** como Event Bus, suporte a filas (BullMQ), eventos internos (Event Emitter), autenticação JWT, Prisma ORM e muito mais.

## 🚀 Tecnologias

- **[NestJS](https://nestjs.com/)** - Framework Node.js progressivo
- **[TypeScript](https://www.typescriptlang.org/)** - Superset JavaScript com tipagem estática
- **[Prisma](https://www.prisma.io/)** - ORM moderno para TypeScript
- **[PostgreSQL](https://www.postgresql.org/)** - Banco de dados relacional
- **[Redis](https://redis.io/)** - Cache e gerenciamento de filas
- **[BullMQ](https://docs.bullmq.io/)** - Sistema de filas baseado em Redis
- **[RabbitMQ](https://www.rabbitmq.com/)** - Broker de mensageria para Event Bus
- **[NestJS Microservices](https://docs.nestjs.com/microservices/basics)** - Integração com RabbitMQ (RMQ Transport)
- **[Event Emitter](https://docs.nestjs.com/techniques/events)** - Sistema de eventos assíncronos in-process
- **[JWT](https://jwt.io/)** - Autenticação baseada em tokens
- **[Passport](http://www.passportjs.org/)** - Middleware de autenticação
- **[Docker](https://www.docker.com/)** - Containerização
- **[Class Validator](https://github.com/typestack/class-validator)** - Validação de DTOs
- **[Zod](https://zod.dev/)** - Validação de schemas TypeScript

## 📋 Pré-requisitos

- Node.js (v18 ou superior)
- Yarn ou npm
- Docker e Docker Compose
- Instância do RabbitMQ (disponível via Docker)
- PostgreSQL (ou usar via Docker)
- Redis (ou usar via Docker)

## 🛠️ Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd nest-boilerplate-2
```

2. Instale as dependências:
```bash
yarn install
# ou
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Application
APP_PORT=3002

# RabbitMQ Configuration
RABBITMQ_URL="amqp://guest:guest@localhost:5672"

# Database
DATABASE_URL="postgresql://root:password@localhost:5432/mydatabase?schema=public"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION_TIME=3600
```

4. Execute as migrações do Prisma:
```bash
npx prisma migrate dev
# ou
yarn prisma migrate dev
```

5. (Opcional) Execute o seed para popular o banco:
```bash
yarn seed
# ou
npm run seed
```

## 🐳 Docker

### Desenvolvimento

Para subir apenas os serviços de infraestrutura (PostgreSQL e Redis):

```bash
make up-dev
```

Para derrubar os serviços:

```bash
make down-dev
```

### Produção

Para buildar e subir todos os containers (app + infraestrutura):

```bash
make docker-build-and-up
```

Para rebuildar e subir os containers:

```bash
make docker-re-build-and-up
```

## 🏃 Executando a aplicação

### Desenvolvimento

```bash
# Modo watch (recompila automaticamente)
yarn dev
# ou
npm run dev
```

### Produção

```bash
# Build
yarn build

# Iniciar
yarn start:prod
# ou
npm run start:prod
```

## 📁 Estrutura do Projeto

```
src/
├── common
│   ├── event-bus/        # Event Bus baseado em RabbitMQ (producers/consumers)
├── @shared/              # Código compartilhado
│   ├── entities/         # Entidades do domínio
│   ├── events/           # Eventos do sistema
│   ├── exceptions/       # Exceções customizadas
│   ├── helpers/          # Funções auxiliares
│   └── interceptors/     # Interceptadores
├── @types/               # Definições de tipos TypeScript
├── consts/               # Constantes
├── decorators/           # Decoradores customizados
├── jobs/                 # Jobs e filas
│   └── queues/
│       └── email/        # Fila de emails
├── modules/              # Módulos da aplicação
│   └── auth/             # Módulo de autenticação
├── providers/            # Provedores de serviços
│   ├── notification/     # Provedores de notificação
│   └── prisma/           # Cliente Prisma
└── main.ts              # Arquivo principal
```

## 🧱 Arquitetura de Event Sourcing & RabbitMQ

A aplicação segue um estilo de arquitetura baseada em eventos:

- **Comandos** chegam aos módulos de aplicação (ex: `UserModule`).
- O **write model** não grava diretamente o estado final, mas **emite eventos de domínio** para o Event Bus.
- O **Event Bus** usa **RabbitMQ** para publicar esses eventos em uma fila/rota.
- **Consumers** (microservices/controllers) reagem a esses eventos e executam os efeitos necessários (envio de email, projeções, side effects, etc).

### Camada de Event Bus (RabbitMQ)

A camada de Event Bus é centralizada em `EventBusModule` e `EventBusService`:

- `EventBusModule` registra um **client RMQ** (`EVENT_BUS`) apontando para o broker RabbitMQ.
- `EventBusService` expõe um método `emit(event: string, payload: any)` para publicar eventos.

Exemplo simplificado de configuração (já existente no projeto):

```typescript
// src/common/event-bus/event-bus.module.ts
@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'EVENT_BUS',
        transport: Transport.RMQ,
        options: {
          urls: ['amqp://localhost:5672'],
          queue: 'events',
          queueOptions: { durable: true },
        },
      },
    ]),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
```

### Produção de Eventos (Write Model)

O serviço de usuário atua como **producer de eventos**. Em vez de apenas persistir dados, ele constrói um evento de domínio e o envia para o Event Bus:

```typescript
// src/modules/user/user.service.ts
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
```

Nesse fluxo:

- O **evento de domínio** `user.created` é publicado com os dados do usuário.
- Esse evento é a **fonte de verdade** para os consumidores que vão reagir a ele.

### Consumo de Eventos (Read Models / Side Effects)

Um microservice/controller dedicado consome o evento publicado no RabbitMQ usando `@EventPattern`:

```typescript
// src/modules/user/events/user-events.controller.ts
@Controller()
export class UserEventsController {
  @EventPattern('user.created')
  async handleUserCreated(@Payload() props: IUserModelEvent) {
    console.log('📧 Enviando email para', props.email);
  }
}
```

Esse padrão permite:

- **Desacoplamento** entre quem emite o evento e quem o consome.
- Adicionar novos consumers (projeções, integrações externas, notificações, etc.) sem impactar o código de escrita.
- Evoluir para um modelo completo de **Event Sourcing**/CQRS, armazenando eventos em um Event Store e gerando diferentes read models.

## 🔐 Autenticação

O projeto inclui um sistema completo de autenticação JWT:

- **POST** `/auth/register` - Registro de novo usuário
- **POST** `/auth/login` - Login e obtenção de token JWT

### Protegendo rotas

Use o decorator `@UseGuards(JwtAuthGuard)` para proteger rotas:

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard';

@Controller('protected')
@UseGuards(JwtAuthGuard)
export class ProtectedController {
  // Suas rotas protegidas
}
```

## 📨 Filas (BullMQ)

O projeto está configurado com BullMQ para processamento assíncrono de jobs.

### Exemplo de uso

```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MyService {
  constructor(
    @InjectQueue('email') private emailQueue: Queue,
  ) {}

  async sendEmail(data: any) {
    await this.emailQueue.add('send-email', data);
  }
}
```

## 🎯 Event Emitter

Além do Event Bus baseado em RabbitMQ, o projeto também usa `EventEmitterModule` para **eventos in-process**, ideais para comunicação interna leve entre módulos dentro da mesma instância da aplicação.

### Emitindo eventos

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class MyService {
  constructor(private eventEmitter: EventEmitter2) {}

  async doSomething() {
    this.eventEmitter.emit('notification.discord.notify', {
      content: 'Mensagem de notificação'
    });
  }
}
```

### Escutando eventos

```typescript
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MyEventHandler {
  @OnEvent('notification.discord.notify')
  async handleEvent(payload: { content: string }) {
    // Processar evento
  }
}
```

## 🗄️ Prisma

### Gerar cliente Prisma

```bash
npx prisma generate
```

### Criar nova migração

```bash
npx prisma migrate dev --name nome_da_migracao
```

### Visualizar banco de dados

```bash
npx prisma studio
```

## 🧪 Testes

```bash
# Testes unitários
yarn test

# Testes em modo watch
yarn test:watch

# Cobertura de testes
yarn test:cov

# Testes E2E
yarn test:e2e
```

## 📝 Scripts Disponíveis

- `yarn build` - Compila o projeto
- `yarn start` - Inicia a aplicação
- `yarn dev` - Inicia em modo desenvolvimento (watch)
- `yarn start:prod` - Inicia em modo produção
- `yarn lint` - Executa o linter
- `yarn format` - Formata o código com Prettier
- `yarn test` - Executa os testes
- `yarn seed` - Popula o banco de dados

## 🔧 Configurações

### Validação Global

O projeto utiliza `ValidationPipe` globalmente com as seguintes configurações:
- `whitelist: true` - Remove propriedades não definidas no DTO
- `forbidNonWhitelisted: true` - Retorna erro para propriedades não permitidas
- `transform: true` - Transforma automaticamente os objetos recebidos

### CORS

CORS está habilitado globalmente. Configure no arquivo `main.ts` conforme necessário.

### Exceções Customizadas

O projeto inclui um sistema de exceções customizadas com `BusinessException` e filtros globais para tratamento de erros.

## 📦 Dependências Principais

### Produção
- `@nestjs/bullmq` - Integração BullMQ
- `@nestjs/event-emitter` - Sistema de eventos
- `@nestjs/jwt` - Autenticação JWT
- `@nestjs/passport` - Autenticação
- `@prisma/client` - Cliente Prisma
- `bullmq` - Sistema de filas
- `ioredis` - Cliente Redis
- `bcrypt` - Hash de senhas
- `class-validator` - Validação
- `zod` - Validação de schemas

### Desenvolvimento
- `@nestjs/cli` - CLI do NestJS
- `@typescript-eslint/*` - Linting TypeScript
- `prettier` - Formatação de código
- `jest` - Framework de testes

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença UNLICENSED.

## 👨‍💻 Autor

Desenvolvido como boilerplate para projetos NestJS.

---

**Nota**: Este é um projeto boilerplate. Certifique-se de configurar adequadamente as variáveis de ambiente e ajustar as configurações de segurança antes de usar em produção.
