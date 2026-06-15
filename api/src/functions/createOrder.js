const { app } = require('@azure/functions');
const { getTableClient, TABLES, orderToEntity, lineToEntity, ensureTables } = require('../services/tableService');

app.http('createOrder', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders',
  handler: async (request, context) => {
    try {
      await ensureTables();

      const order = await request.json();

      if (!order.id || !order.orderNumber) {
        return { status: 400, jsonBody: { error: 'Order id and orderNumber are required' } };
      }

      const ordersClient = getTableClient(TABLES.ORDERS);
      const linesClient = getTableClient(TABLES.ORDER_LINES);

      // Store order header
      const orderEntity = orderToEntity(order);
      await ordersClient.createEntity(orderEntity);

      // Store order lines
      if (order.lines && order.lines.length > 0) {
        for (const line of order.lines) {
          const lineEntity = lineToEntity(order.id, line);
          await linesClient.createEntity(lineEntity);
        }
      }

      return {
        status: 201,
        jsonBody: { id: order.id, message: 'Order created successfully' },
      };
    } catch (error) {
      context.error('Error creating order:', error);
      if (error.statusCode === 409) {
        return { status: 409, jsonBody: { error: 'Order already exists' } };
      }
      return { status: 500, jsonBody: { error: 'Failed to create order' } };
    }
  }
});
