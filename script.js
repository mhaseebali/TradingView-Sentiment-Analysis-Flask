document.getElementById('showdata').addEventListener('click', function() {
	executeStepFunction();
});

function executeStepFunction() {
	console.log("entered executeStepFunction");
	const scriptName = document.getElementById('script_name').value;
    const interval = document.getElementById('bar-interval').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const strategy = document.getElementById('strategy').value;

	loading.style.display = 'block';

    // Prepare the data to be sent
    const data = {
        script_name: scriptName,
        interval: interval,
        start_date: startDate,
        end_date: endDate,
        strategy: strategy
    };
	
    // Replace with your API Gateway endpoint
    var apiGatewayEndpoint = 'https://vdcafrqwch.execute-api.ap-south-1.amazonaws.com/test/xai';

	console.log("data to be passed is ",data);
	
    // Start the Step Function Execution
    fetch(apiGatewayEndpoint, { 
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		})
        .then(response => response.json()) // Convert response to JSON
        .then(data => {
            console.log("Received data:", data); // Log the received data
            // Parse the JSON string in the 'body' field
            var bodyObj = JSON.parse(data.body);
            console.log("Parsed body:", bodyObj); // Log the parsed body object
            var executionArn = bodyObj.executionArn;
            console.log("Execution ARN:", executionArn); // Log the extracted executionArn
            checkStepFunctionStatus1(executionArn);
        })
        .catch(error => console.error('Error starting execution:', error));
		
		
}

function checkStepFunctionStatus(executionArn) {
    // Replace with your API Gateway endpoint
    const apiGatewayEndpoint = 'https://8fz2ihbjxi.execute-api.ap-south-1.amazonaws.com/test/xaistatus';
    
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionArn: executionArn })
    };
    
    fetch(apiGatewayEndpoint, requestOptions)
        .then(response => response.json())
        .then(data => {
            console.log('Status:', data.status);
            // Process the response data
        })
        .catch(error => console.error('Error:', error));
}

function plotHTMLChart(stockData) {
	// Parse the body to get the array of data points
	const data = JSON.parse(stockData.body);
	// Map the data to the format expected by TradingView charts
	const candlestickSeriesData = data.map(item => ({
		time: item.Date.split('T')[0], // Extract the date part
		open: item.Open,
		high: item.High,
		low: item.Low,
		close: item.Close
	}));
	console.log("Data received while plotting CHart is ",data)
	// Create the chart
	
	const chartContainer = document.getElementById('chart'); // Get the chart container
    chartContainer.innerHTML = ''; // Clear any existing content
    const chart = LightweightCharts.createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
            background: { color: '#222' },
            textColor: '#DDD',
        },
        grid: {
            vertLines: { color: '#444' },
            horzLines: { color: '#444' },
        },
    });

	// Add a candlestick series to the chart
	const candleSeries = chart.addCandlestickSeries();
	candleSeries.setData(candlestickSeriesData);
	// Hide loading text when data is fetched
    loading.style.display = 'none';
	// Set the data for the Main Series

	// Assuming `chart` is your chart instance and `candleSeries` is your candlestick series instance
	let markers = [];

	const marker_data = JSON.parse(stockData.body);

	marker_data.forEach((data1) => {
		if (data1.action) { // Check if there is a buy/sell action
			markers.push({
				time: data1.Date.split('T')[0], // Extract the date part for the marker
				position: data1.action === 'buy' ? 'aboveBar' : 'belowBar', // Position based on action
				color: data1.action === 'buy' ? 'green' : 'red', // Color based on action
				shape: 'arrowDown', // Can use 'arrowUp' for buys if preferred
				id: `marker_${data1.Date}`,
				text: data1.action.toUpperCase(), // Text displayed in the marker
			});
		}
	});

	// Add markers to the series
	candleSeries.setMarkers(markers);
	
	const volumeSeries = chart.addHistogramSeries({
		color: "#26a69a",
		priceFormat: {
			type: 'volume',
		},
		priceScaleId: '',
		scaleMargins: {
			top: 0.8,
			bottom: 0.2,
		},
	});

	// Prepare volume data for the histogram series
	let volumeData = marker_data.map(data => ({
		time: data.Date.split('T')[0], // Extract the date part
		value: data.Volume,
		color: data.action === 'buy' ? 'green' : data.action === 'sell' ? 'red' : '#26a69a', // Optional: color volume bars based on action
	}));

	// Set the volume data on the histogram series
//	volumeSeries.setData(volumeData);
// marker_data has the data 

	let initialBalance = 10000; // Starting balance in your trading account
	let currentBalance = initialBalance;
	let stockUnits = 0; // Starting with 0 units of stock
	last_closing_price =0;
	item = 0;
	first_opening_price = 0;
	first_units = 0;
	marker_data.forEach(trade => {
		last_closing_price = trade.Close;
		if(item==0){
			first_opening_price = trade.Open;
			first_closing_price = trade.Close;
//			first_units = initialBalance / first_opening_price;
			first_units = initialBalance / first_closing_price;
			console.log("first opening balance :",first_opening_price);
			console.log("Initial Units bought :",first_units);
			item+=1;
		}
		if(trade.action === "buy") {
			// Calculate the cost of the purchase and reduce the balance
			const cost = trade.action_price * trade.units;
			currentBalance -= cost; // Subtract the cost from current balance
			stockUnits += trade.units; // Increase stock units
		} else if(trade.action === "sell" && stockUnits > 0) {
			// For sell actions, use the stockUnits as the quantity since units are always 0 for sells
			const revenue = trade.action_price * stockUnits;
			currentBalance += revenue; // Add the revenue to current balance
			stockUnits = 0; // Reset stock units to 0 after selling
		}
		// For entries without an action or if stockUnits <= 0 during a sell, do nothing
	});

	currentBalance += (stockUnits * last_closing_price)
	console.log(`Final Balance: ${currentBalance.toFixed(2)}`);
	console.log(`Stock Units Remaining: ${stockUnits.toFixed(2)}`);

	console.log("Marker List is",markers);

	profitLossValue = currentBalance - initialBalance;
	// Update the HTML content
	document.getElementById('initialAmount').textContent = `Initial Amount: $${initialBalance.toFixed(2)}`;
	document.getElementById('finalBalance').textContent = `Final Balance: $${currentBalance.toFixed(2)}`;
	document.getElementById('profitLoss').textContent = `Profit / Loss: $${profitLossValue.toFixed(2)}`;
	document.getElementById('initialAmount').style.display = 'block';
	document.getElementById('finalBalance').style.display = 'block';
	document.getElementById('profitLoss').style.display = 'block';

	bhcurrentBalance = first_units * last_closing_price
	bhprofitLossValue = bhcurrentBalance - initialBalance;

	// Update the HTML content
	document.getElementById('bhinitialAmount').textContent = `Initial Amount: $${initialBalance.toFixed(2)}`;
	document.getElementById('bhfinalBalance').textContent = `Final Balance: $${bhcurrentBalance.toFixed(2)}`;
	document.getElementById('bhprofitLoss').textContent = `Profit / Loss: $${bhprofitLossValue.toFixed(2)}`;
	document.getElementById('bhinitialAmount').style.display = 'block';
	document.getElementById('bhfinalBalance').style.display = 'block';
	document.getElementById('bhprofitLoss').style.display = 'block';

	console.log("first opening balance :",first_opening_price);
	console.log("Initial Units bought :",first_units);


	// Optional: Change color based on profit or loss
	const profitLossElement = document.getElementById('profitLoss');
	if (profitLossValue < 0) {
		profitLossElement.style.color = 'red'; // Loss is shown in red
	} else {
		profitLossElement.style.color = 'green'; // Profit is shown in green
	}

	// Optional: Change color based on profit or loss
	const bhprofitLossElement = document.getElementById('bhprofitLoss');
	if (bhprofitLossValue < 0) {
		bhprofitLossElement.style.color = 'red'; // Loss is shown in red
	} else {
		bhprofitLossElement.style.color = 'green'; // Profit is shown in green
	}


	window.addEventListener('resize', () => {
		chart.resize(chartContainer.clientWidth, chartContainer.clientHeight);
	});
}
function checkStepFunctionStatus1(executionArn) {
    const apiGatewayEndpoint = 'https://8fz2ihbjxi.execute-api.ap-south-1.amazonaws.com/test/xaistatus';

    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "executionArn": executionArn })
    };



    // Function to perform the status check
	const pollStatus = () => {
		fetch(apiGatewayEndpoint, requestOptions)
			.then(response => response.json()) // Parses the JSON response body to a JavaScript object
			.then(data => {
				console.log("Response is",data)
				// Now 'data.body' is a JSON-encoded string, so parse it again to get the actual object
				const responseBody = JSON.parse(data.body);
				console.log('Status:', responseBody.status);
				
				// Check the status and act accordingly
				if (responseBody.status === 'SUCCEEDED') {
					// If execution succeeded, parse the 'output' to get the actual result
					const output = JSON.parse(responseBody.output);
					console.log('Output:', output);
					// Handle the output data as needed
					 clearInterval(pollingInterval);
					 plotHTMLChart(output);
					 
					 const parameters = output.parameters;
					 
					 console.log("Output Parameters",parameters);
					 // here you can display the code to output the additional optimizer UI
					 generateInputFields(parameters, 'optimize-data')																													 
				} else if (responseBody.status === 'RUNNING') {
					// If still running, log and decide if you want to poll again
					console.log('Execution still in progress...');
					// Optionally, implement logic to retry after a delay
				} else {
					// Handle other statuses (FAILED, TIMED_OUT, etc.)
					console.log('Execution completed with status:', responseBody.status);
					// Optionally, handle completion based on status
					 clearInterval(pollingInterval);
				}
			})
			.catch(error => console.error('Error fetching execution status:', error));
	};

    // Start polling every 5 seconds
    let pollingInterval = setInterval(pollStatus, 10000);
}

function generateInputFields(parameters, targetElementId) {
    const target = document.getElementById(targetElementId);
    target.innerHTML = ''; // Clear existing content

    Object.entries(parameters).forEach(([parameter, value]) => {
        // Assuming value is the high value for the parameter
        const lowValue = value - 10; // Example: you might calculate this differently
        const highValue = value; // High value as returned
        const stepValue = 2; // Step fixed to 2

        const container = document.createElement('div');
        container.innerHTML = `
            <label>${parameter}</label><br>
            <input type="number" id="${parameter}_low" placeholder="Low" value="${lowValue}"><br>
            <input type="number" id="${parameter}_high" placeholder="High" value="${highValue}"><br>
            <input type="number" id="${parameter}_step" placeholder="Step" value="${stepValue}"><br>
        `;
        target.appendChild(container);
    });
	
	// Adding the Optimize button
    const optimizeButton = document.createElement('button');
    optimizeButton.textContent = 'Optimize';
    optimizeButton.onclick = function() { optimize(); }; // Assuming optimize is a function you've defined elsewhere
    target.appendChild(optimizeButton);
}


// Example usage:
// checkStepFunctionStatus('arn:aws:states:ap-south-1:599541581870:execution:XaiStateMachine:b1e672b5-97c3-4718-9fca-56c4c02f3f99');

