import { schemas } from '../../src/middleware/validate.js';

describe('Goal request schemas', () => {
  const baseGoal = {
    thrustArea: 'Safety',
    title: 'Maintain zero incidents',
    description: 'Track and maintain zero safety incidents for the quarter.',
    weightage: 20,
  };

  it('allows zero-based goals with target 0', () => {
    const { error, value } = schemas.createGoal.validate({
      ...baseGoal,
      uom: 'zero',
      target: 0,
    });

    expect(error).toBeUndefined();
    expect(value.target).toBe(0);
  });

  it('rejects zero-based goals with non-zero target', () => {
    const { error } = schemas.createGoal.validate({
      ...baseGoal,
      uom: 'zero',
      target: 1,
    });

    expect(error).toBeDefined();
  });

  it('rejects percentage targets above 100', () => {
    const { error } = schemas.createGoal.validate({
      ...baseGoal,
      uom: 'percent-min',
      target: 101,
    });

    expect(error).toBeDefined();
  });
});
