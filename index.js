const {log, error} =console;
const express = require('express');
const app = express();
const server = app.listen(3000, log('Proxy server is running on port 3000'));
const got = require('got');

app.get('/', (_, res) => res.status(200).send('Proxy Server works!'));


app.get('/:symbol/:interval', async(req,res)=> {
    try {
        const { symbol, interval}= req.params;
        const resp = await got(
            `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}`
        );
        const  data=JSON.parse(resp.body);
        const klinedata =  data.map((d) => ({
                time: d[0] / 1000,
                open: d[1] * 1,
                high: d[2] * 1,
                low: d[3] * 1,
                close: d[4] * 1,
            }));
        res.status(200).json(klinedata);
    } catch(err) {
        res.status(500).send(err);
    }
    
})