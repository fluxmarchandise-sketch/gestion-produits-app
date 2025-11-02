export async function handler(event, context) {
  // CSV ديالك كيجي من query string
  const csv = event.queryStringParameters.csv || "";

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/csv",
      "Access-Control-Allow-Origin": "*"
    },
    body: csv
  }
}