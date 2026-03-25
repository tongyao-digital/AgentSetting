const NUMBER_STRING_REGEX = /^[0-9]+$/;

function isNumberString(value) {
  return typeof value === 'string' && NUMBER_STRING_REGEX.test(value);
}

module.exports = {
  isNumberString,
  NUMBER_STRING_REGEX,
};

