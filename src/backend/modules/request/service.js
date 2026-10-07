const requestRepo = require("./repository");

const getMyRequests = async (requesterId) => {
  const requests = await requestRepo.findRequestsByRequester(requesterId);
  return requests;
};

const submitRequest = async (requestData) => {
  if (
    !requestData.title ||
    !requestData.description ||
    !requestData.street_address ||
    !requestData.category_id
  ) {
    throw new Error("Missing mandatory fields");
  }

  const result = await requestRepo.createRequest(requestData);
  return result;
};

module.exports = { getMyRequests, submitRequest };
