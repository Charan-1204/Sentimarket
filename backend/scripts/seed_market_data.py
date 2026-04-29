from __future__ import annotations

import argparse
import asyncio
from typing import List

from backend.services.market_aggregator import MarketAggregator


DEFAULT_SYMBOLS = ["BTC", "ETH", "SOL", "DOGE", "PEPE", "AVAX"]


async def seed_symbols(symbols: List[str], days: int) -> None:
    agg = MarketAggregator()
    for symbol in symbols:
        sym = symbol.upper()
        await agg.get_price(sym)
        await agg.get_quote(sym)
        await agg.get_historical(sym, days=days)


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed initial market data into MySQL RDS")
    parser.add_argument("--symbols", nargs="*", default=DEFAULT_SYMBOLS)
    parser.add_argument("--days", type=int, default=30)
    args = parser.parse_args()
    asyncio.run(seed_symbols(args.symbols, args.days))
    print("Seed complete")


if __name__ == "__main__":
    main()

