const { app } = require('@azure/functions');
const { getTableClient, TABLES } = require('../services/tableService');

app.http('sendToD365', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'orders/{orderId}/send-to-d365',
  handler: async (request, context) => {
    const orderId = request.params.orderId;

    try {
      const ordersClient = getTableClient(TABLES.ORDERS);

      // Fetch existing order
      let entity;
      try {
        entity = await ordersClient.getEntity('ORDER', orderId);
      } catch (err) {
        if (err.statusCode === 404) {
          return { status: 404, jsonBody: { error: 'Order not found' } };
        }
        throw err;
      }

      // Only allow sending from approved status
      if (entity.status !== 'approvato') {
        return {
          status: 400,
          jsonBody: { error: `Cannot send to D365: order must be approved first (current status: ${entity.status})` }
        };
      }

      entity.status = 'inviato_d365';
      await ordersClient.updateEntity(entity, 'Replace');

      // TODO: Here you would integrate with Dynamics 365 API
      context.log(`Order ${orderId} sent to D365`);

      return {
        status: 200,
        jsonBody: { id: orderId, status: 'inviato_d365', message: 'Order sent to D365' },
      };
    } catch (error) {
      context.error('Error sending to D365:', error);
      return { status: 500, jsonBody: { error: 'Failed to send order to D365' } };
    }
  }
});
