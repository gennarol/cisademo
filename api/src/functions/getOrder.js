const { app } = require('@azure/functions');
const { getTableClient, TABLES, entityToOrder, entityToLine, entityToCorrection } = require('../services/tableService');

app.http('getOrder', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}',
  handler: async (request, context) => {
    const orderId = request.params.orderId;

    try {
      const ordersClient = getTableClient(TABLES.ORDERS);
      const linesClient = getTableClient(TABLES.ORDER_LINES);
      const correctionsClient = getTableClient(TABLES.CORRECTION_REQUESTS);

      // Fetch order
      let entity;
      try {
        entity = await ordersClient.getEntity('ORDER', orderId);
      } catch (err) {
        if (err.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'Order not found' } };
        }
        throw err;
      }

      const order = entityToOrder(entity);

      // Fetch lines
      order.lines = [];
      const linesIterator = linesClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${orderId}'` }
      });
      for await (const lineEntity of linesIterator) {
        order.lines.push(entityToLine(lineEntity));
      }
      order.lines.sort((a, b) => a.lineNumber - b.lineNumber);

      // Fetch correction requests
      order.correctionRequests = [];
      const corrIterator = correctionsClient.listEntities({
        queryOptions: { filter: `PartitionKey eq '${orderId}'` }
      });
      for await (const corrEntity of corrIterator) {
        order.correctionRequests.push(entityToCorrection(corrEntity));
      }
      order.correctionRequests.sort((a, b) => new Date(a.date) - new Date(b.date));

      return {
        status: 200,
        jsonBody: order,
      };
    } catch (error) {
      context.error('Error fetching order:', error);
      return { status: 500, jsonBody: { error: 'Failed to fetch order' } };
    }
  }
});
