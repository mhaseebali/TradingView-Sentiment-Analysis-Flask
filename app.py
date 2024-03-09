from flask import Flask, jsonify, request, render_template
import yfinance as yf
from textblob import TextBlob
import requests
import pandas as pd
import pytz  

app = Flask(__name__)

# Route to serve the xai.html file
@app.route('/')
def index():
    return render_template('xai.html')

# Route to handle API requests from the frontend
@app.route('/stock_data', methods=['GET', 'POST'])
def get_stock_data():
    if request.method == 'GET':
        ticker = request.args.get('ticker')  # Get the ticker symbol from query parameters
        # Perform any necessary processing for GET requests
        # For example: Fetch historical stock price data using yfinance
        stock_data = yf.download(ticker, period='1y', interval='1d')
        
        # Localize index to UTC timezone
        stock_data.index = stock_data.index.tz_localize('UTC')
        
        # Convert index to a specific timezone (e.g., New York)
        stock_data.index = stock_data.index.tz_convert('America/New_York')
        
        # Convert Timestamp index to string
        stock_data.index = stock_data.index.strftime('%Y-%m-%d')
        
        # Perform sentiment analysis
        sentiment_score = analyze_news_sentiment(ticker)
        
        # Convert DataFrame to dictionary
        stock_data_dict = stock_data.to_dict(orient='index')
        
        # Merge stock data with sentiment analysis results
        combined_data = {'stock_data': stock_data_dict, 'sentiment_score': [{'Date': stock_data.index[-1], 'Score': sentiment_score}]}
        
        return jsonify(combined_data)
    
    elif request.method == 'POST':
        # Perform processing for POST requests
        ticker = request.json.get('ticker')
        script_name = request.json.get('script_name')
        interval = request.json.get('interval')
        start_date = request.json.get('start_date')
        end_date = request.json.get('end_date')
        
        # Fetch historical stock price data using yfinance
        stock_data = yf.download(ticker, period='1y', interval='1d')
        
        # Perform sentiment analysis
        sentiment_score = analyze_news_sentiment(ticker)
        
        # Merge stock data with sentiment analysis results
        combined_data = merge_data(stock_data, sentiment_score)
        
        return jsonify(combined_data)


def analyze_news_sentiment(ticker):
    # Fetch recent news headlines related to the specified ticker
    news_api_url = f'https://newsapi.org/v2/everything?q={ticker}&apiKey=70d234d8e58648119c425cee2fe8427d'
    response = requests.get(news_api_url)
    news_data = response.json()

    # Extract and concatenate news headlines
    headlines = [article['title'] for article in news_data['articles']]
    textual_data = ' '.join(headlines)

    # Perform sentiment analysis on the concatenated textual data
    sentiment = TextBlob(textual_data)
    sentiment_score = sentiment.sentiment.polarity

    return sentiment_score

def merge_data(stock_data, sentiment_score):
    # Convert Timestamp objects to strings
    stock_data_str = stock_data.reset_index().rename(columns={'index': 'Date'})
    stock_data_str['Date'] = stock_data_str['Date'].dt.strftime('%Y-%m-%d')

    # Merge stock data with sentiment analysis results
    combined_data = {'stock_data': stock_data_str.to_dict(), 'sentiment_score': [{'Date': stock_data.index[-1], 'Score': sentiment_score}]}
    return combined_data

if __name__ == '__main__':
    app.run(debug=True)
