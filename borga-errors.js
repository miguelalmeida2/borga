"use strict";

function buildErrorList() {
  const errors = {};

  function addError(code, name, description) {
    errors[name] = (info) => {
      return { code, name, description, info };
    };
  }

  addError(1000, "FAILURE", "An error occurred");
  addError(1001, "NOT_FOUND", "The item was not found");
  addError(1002, "EXT_SVC_FAILURE", "External service failure");
  addError(1003, "ALREADY_EXISTS", "The item already exists");
  addError(1003, "MISSING_PARAM", "Required parameter missing");
  addError(1004, "INVALID_PARAM", "Invalid value for parameter");
  addError(1005, "UNAUTHENTICATED", "Invalid or missing token");

  return errors;
}

module.exports = buildErrorList();
