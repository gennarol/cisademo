const { app } = require('@azure/functions');
const { getTableClient, TABLES, entityToOrder, entityToLine, entityToCorrection } = require('../services/tableService');

app.http('getOrders', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    try {
      const ordersClient = getTableClient(TABLES.ORDERS);
      const linesClient = getTableClient(TABLES.ORDER_LINES);
      const correctionsClient = getTableClient(TABLES.CORRECTION_REQUESTS);

      // Fetch all orders
      const orders = [];
      const ordersIterator = ordersClient.listEntities({
        queryOptions: { filter: "PartitionKey eq 'ORDER'" }
      });
      for await (const entity of ordersIterator) {
        orders.push(entityToOrder(entity));
      }

      // Fetch lines and corrections for all orders
      for (const order of orders) {
        order.lines = [];
        const linesIterator = linesClient.listEntities({
          queryOptions: { filter: `PartitionKey eq '${order.id}'` }
        });
        for await (const lineEntity of linesIterator) {
          order.lines.push(entityToLine(lineEntity));
        }
        order.lines.sort((a, b) => a.lineNumber - b.lineNumber);

        order.correctionRequests = [];
        const corrIterator = correctionsClient.listEntities({
          queryOptions: { filter: `PartitionKey eq '${order.id}'` }
        });
        for await (const corrEntity of corrIterator) {
          order.correctionRequests.push(entityToCorrection(corrEntity));
        }
        order.correctionRequests.sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      // Sort by date desc
      orders.sort((a, b) => new Date(b.date) - new Date(a.date));

      return {
        status: 200,
        jsonBody: orders,
      };
    } catch (error) {
      context.error('Error fetching orders:', error);
      return { status: 500, jsonBody: { error: 'Failed to fetch orders' } };
    }
  }
});
