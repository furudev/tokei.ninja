type State = {
  counter: number;
};

export const Counter = () => {
  const state: State = {
    counter: 0,
  };

  const increase = () => {
    state.counter += 1;
  };

  const decrease = () => {
    state.counter -= 1;
  };

  return {
    counter: state.counter,
    increase,
    decrease,
  };
};

Counter();
