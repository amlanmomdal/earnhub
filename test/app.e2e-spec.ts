import { AppController } from './../src/app.controller';

describe('AppController (e2e)', () => {
  it('/health (GET)', () => {
    const controller = new AppController();
    const response = controller.getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('nest-setup');
  });
});
