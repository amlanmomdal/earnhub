import { AppController } from './app.controller';

describe('AppController', () => {
  it('returns a healthy status payload', () => {
    const controller = new AppController();
    const response = controller.getHealth();

    expect(response.status).toBe('ok');
    expect(response.service).toBe('nest-setup');
    expect(response.timestamp).toEqual(expect.any(String));
  });
});
