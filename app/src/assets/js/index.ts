type State = {
  counter: number;
};

export const Counter = () => {
  const state: State = {
    counter: 0,
  };

  const increase = (amount: number) => {
    state.counter += amount;
  };

  const decrease = (amount: number) => {
    state.counter -= amount;
  };

  const multiply = (amount: number) => {
    state.counter *= amount;
  };

  return {
    counter: state.counter,
    increase,
    decrease,
    multiply,
  };
};

const { increase, decrease, counter, multiply } = Counter();

console.log(counter);
increase(10);
decrease(20);
decrease(10);
console.log(counter);
decrease(30);
console.log(counter);
decrease(5);
multiply(100);
console.log(counter);
