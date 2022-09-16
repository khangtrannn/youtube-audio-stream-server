const stringUtils = (function () {
  const findTextBetween = (text, begin, end) => {
    return text.split(begin)[1]?.split(end)[0];
  };

  return {
    findTextBetween,
  };
})();

module.exports = stringUtils;
