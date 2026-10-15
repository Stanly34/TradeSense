export interface IctVideo {
  title: string
  youtubeId: string
  minutes?: number
  url?: string
}

export interface IctSection {
  name: string
  videos: IctVideo[]
}

export interface IctPart {
  title: string
  description: string
  tags: string[]
  sections: IctSection[]
}

export const DEFAULT_VIDEO_MINUTES = 45

const v = (title: string, youtubeId: string, minutes: number, url?: string): IctVideo => ({ title, youtubeId, minutes, url })

const M9_PL = 'PLVgHx4Z63paZfDRSk94aEMoYKUBqQgj0b'
const M10_PL = 'PLVgHx4Z63paZdnxymLp2Ihj-Pc_-foVVV'
const M12_PL = 'PLVgHx4Z63paaQ-8s2wrhfi6N2O_lTPuAI'
const M22_PL = 'PLVgHx4Z63paYiFGQ56PjTF1PGePL3r69s'

const monthOne: IctVideo[] = [
  v('Elements Of A Trade Setup', '0LhteuLVuDU', 20),
  v('How Market Makers Condition The Market', 'XwYYWBttWro', 25),
  v('What To Focus On Right Now', 'B7_cjybYQ0g', 25),
  v('Equilibrium Vs. Discount', 'qC0LogyIk2I', 56),
  v('Equilibrium Vs. Premium', 'YuefjnUKQdM', 21),
  v('Fair Valuation', 'SiVmoeyOWZE', 33),
  v('Liquidity Runs', '22XkhpJR5eA', 25),
  v('Impulse Price Swings & Market Protraction', 'K4LtfujVpJs', 12),
]

const monthTwo: IctVideo[] = [
  v('Growing Small Accounts', 'mjVHmE1gVMg', 29),
  v('Framing Low Risk Trade Setups', 'Zsg8IeBtfu0', 10),
  v('How Traders Make 10% Per Month', 'pctqB3UD6dk', 18),
  v('No Fear Of Losing', 'pFdW8wdR9sQ', 20),
  v('How To Mitigate Losing Trades Effectively', 'vWDElb65YHg', 18),
  v('The Secrets To Selecting High Reward Setups', 'bftKgceXqYo', 64),
  v('Market Maker Trap False Flag', 'cRbPS3uxkj4', 30),
  v('Market Maker Trap False Breakouts', 'pv2-R-STviA', 21),
]

const monthThree: IctVideo[] = [
  v('Timeframe Selection & Defining Setups', 'UF5J0nEBc0E', 49),
  v('Institutional Order Flow', 'PQkcFbr61FI', 31),
  v('Institutional Sponsorship', 't2VNzJZ4hK4', 44),
  v('The Next Setup - Anticipatory Skill Development', '9kabTfUEVKg', 15),
  v('Institutional Market Structure', 'GuycI8XubgE', 21),
  v('Macro Economic To Micro Technical', 'MJwWUd_FM-k', 19),
  v('Market Maker Trap Trendline Phantoms', 'o8NfSK-pUlE', 25),
  v('Market Maker Trap Head Shoulders Pattern', 'w8lbrvZXUVY', 18),
]

const monthFour: IctVideo[] = [
  v('Interest Rate Effects On Currency Trades', '6oQVb0zVxMM', 21),
  v('Reinforcing Liquidity Concepts & Price Delivery', 'npL3ZXJ5zOU', 44),
  v('Orderblocks', 'PIYh0CxoY9c', 36),
  v('Mitigation Blocks', 'FOUzW0QmsfI', 15),
  v('ICT Breaker Block', 'UrS-mtGHtAA', 10),
  v('ICT Rejection Block', 'oALYX0HCSYw', 15),
  v('Reclaimed ICT Orderblock', 'X5pQjfkAUCI', 11),
  v('ICT Propulsion Block', 'glu98jAH8vE', 8),
  v('ICT Vacuum Block', 'shPGUz9pU-A', 15),
  v('Liquidity Voids', 'HTQgH11W37o', 15),
  v('Liquidity Pools', 'Gnw54f9v6SA', 22),
  v('ICT Fair Value Gaps FVG', 'FgacYSN9QEo', 18),
  v('Divergence Phantoms', 'Xae0VrbkyFk', 22),
  v('Double Bottom Double Top', 'owq30ATPU5s', 15),
]

const monthFive: IctVideo[] = [
  v('Quarterly Shifts & IPDA Data Ranges', 'n7SPAK_tpN8', 55),
  v('Open Float', 'BkmZgjuYREU', 24),
  v('Using IPDA Data Ranges', 'LRKtiysz4nA', 123),
  v('Defining Open Float Liquidity Pools', 'vqtA1S9JH34', 28),
  v('Defining Institutional Swing Points', 'xRjKtUEKkSE', 33),
  v('Using 10 Year Notes In HTF Analysis', 'z-7ypchAMDE', 18),
  v('Qualifying Trade Conditions With 10 Year Yields', 'N8_8tEw2_44', 10),
  v('Interest Rate Differentials', 'w6VlX-rsTUs', 19),
  v('How To Use Intermarket Analysis', '4i_hnoEk6lw', 21),
  v('How To Use Bullish Seasonal Tendencies In HTF Analysis', '6Sp-pr3yCkc', 19),
  v('How To Use Bearish Seasonal Tendencies In HTF Analysis', 'Vb6ueaPqut0', 35),
  v('Ideal Seasonal Tendencies', 'O2Sio7opKxo', 14),
  v('Money Management', 'crPpMwgwa7k', 34),
  v('Defining HTF PD Arrays', 'pwO-E-OOH5k', 32),
  v('Trade Conditions & Setup Progressions', 'Y1oxwc354oo', 28),
  v('Stop Entry Techniques For Long Term Traders', 'vb_Yc-gCBfU', 14),
  v('Limit Order Entry Techniques For Long Term Traders', 'WDattjFvNBc', 11),
  v('Position Trade Management', 'okN5p701T7Y', 26),
]

const monthSix: IctVideo[] = [
  v('Ideal Swings Conditions For Any Market', '0juYnbKays', 20),
  v('Elements To Successful Swing Trading', 'Xs1i0aIeTME', 22),
  v('Classic Swing Trading Approach', 'g--tikwaupk', 40),
  v('High Probability Swing Trade Setups In Bull Markets', 'osRUnIpGIJ0', 40),
  v('High Probability Swing Trade Setups In Bear Markets', 'soY9zX3gt2U', 32),
  v('Reducing Risk and Maximizing Potential Reward In Swing Setups', 'JAjL7rUX2Iw', 30),
  v('Keys To Selecting Markets That Will Move Explosively', 'Hoo_wTMgdcY', 27),
  v('The Million Dollar Swing Setup', 'VL4YLTRerHY', 38),
]

const monthSeven: IctVideo[] = [
  v('Short Term Trading Using Monthly & Weekly Ranges', 'mQA8jCem9d0', 45),
  v('Short Term Trading Defining Weekly Range Profiles', 'wFjeUzJys7w', 11),
  v('Short Term Trading Market Maker Manipulation Templates', 'hbE8S5FSdtQ', 41),
  v('Short Term Trading Blending IPDA Data Ranges & PD Arrays', 'YV4fEF4d2wA', 16),
  v('Short Term Trading Low Resistance Liquidity Runs Part 1', 'y0lVKWLsZeM', 25),
  v('Short Term Trading Low Resistance Liquidity Runs Part 2', 'O69iFqP1j7o', 26),
  v('Intraweek Market Reversals & Overlapping Models', 'jvc105qaCJs', 29),
  v('One Shot One Kill Model', 'LBlK6JB0QS0', 38),
]

const monthEight: IctVideo[] = [
  v('Essentials To ICT Daytrading', '-cXnnHjy9s0', 47),
  v('Defining The Daily Range', '_2nUKLAD9ig', 11),
  v('Central Bank Dealers Range', 'nI1AMOC1pro', 17),
  v('Projecting Daily Highs & Lows', 'JKzEhfwV1dY', 30),
  v('Intraday Profiles', 'eU8WcUftUtY', 22),
  v('When To Avoid The London Session', 'stK2gNqhLaM', 35),
  v('High Probability Daytrade Setups', '5Z_3NbclMSY', 31),
  v('Integrating Daytrades With HTF Trade Entries', '1MnfiqKx5Uo', 24),
]

const monthNine: IctVideo[] = [
  v('The Sentiment Effect', '_TNhWRPa6GA', 13),
  v('Filling The Numbers', 'zanmou0ic5U', 29),
  v('20 Pips Per Day', 'km0haQkTalc', 19),
  v('Trading In Consolidations', 'g7jchu4g31c', 21, `https://www.youtube.com/watch?v=g7jchu4g31c&list=${M9_PL}&index=4`),
  v('Trading Market Reversals', 'KrGTimL3YRQ', 37, `https://www.youtube.com/watch?v=KrGTimL3YRQ&list=${M9_PL}&index=5`),
  v('Bread & Butter Buy Setups', 'OVfn-gDk2dE', 32, `https://www.youtube.com/watch?v=OVfn-gDk2dE&list=${M9_PL}&index=6`),
  v('Bread & Butter Sell Setups', '-oMtfDvc18Y', 28, `https://www.youtube.com/watch?v=-oMtfDvc18Y&list=${M9_PL}&index=7`),
  v('ICT Day Trade Routine', 'cqf8nH54bb8', 58, `https://www.youtube.com/watch?v=cqf8nH54bb8&list=${M9_PL}&index=8`),
]

const monthTen: IctVideo[] = [
  v('Commitment Of Traders', '9H4iaaQXV5Y', 35, `https://www.youtube.com/watch?v=9H4iaaQXV5Y&list=${M10_PL}&index=1`),
  v('Relative Strength Analysis - Accumulation & Distribution', 'ygtvWKyOzHQ', 40, `https://www.youtube.com/watch?v=ygtvWKyOzHQ&list=${M10_PL}&index=2`),
  v('Commodity Seasonals Tendencies - My Personal Favorites', 'R2NjnYozhdw', 42, `https://www.youtube.com/watch?v=R2NjnYozhdw&list=${M10_PL}&index=3`),
  v('Premium Vs. Carrying Charge Market', 'WsolkBzpDOQ', 19, `https://www.youtube.com/watch?v=WsolkBzpDOQ&list=${M10_PL}&index=4`),
  v('Open Interest Secrets & Smart Money Footprints', 'qRYkTWePXF0', 21, `https://www.youtube.com/watch?v=qRYkTWePXF0&list=${M10_PL}&index=5`),
  v('Bond Trading - Basics & Opening Range Concept', 'CGbSpa_9Z9Y', 18, `https://www.youtube.com/watch?v=CGbSpa_9Z9Y&list=${M10_PL}&index=6`),
  v('Bond Trading - Split Session Rules', 'JpV-J31mxhg', 18, `https://www.youtube.com/watch?v=JpV-J31mxhg&list=${M10_PL}&index=7`),
  v('Bond Trading - Consolidation Days', 'RgpxhuVp5Xg', 27, `https://www.youtube.com/watch?v=RgpxhuVp5Xg&list=${M10_PL}&index=8`),
  v('Bond Trading - Trending Days', 'S0ouOvtjV2I', 20, `https://www.youtube.com/watch?v=S0ouOvtjV2I&list=${M10_PL}&index=9`),
  v('Index Futures - Basics & Opening Range Concept', 'ORbtHOUzAIM', 12, `https://www.youtube.com/watch?v=ORbtHOUzAIM&list=${M10_PL}&index=10`),
  v('Index Futures - AM Trend', 'wWCKTEhVp2o', 20, `https://www.youtube.com/watch?v=wWCKTEhVp2o&list=${M10_PL}&index=11`),
  v('Index Futures - PM Trend', 'qZg_5bac518', 13, `https://www.youtube.com/watch?v=qZg_5bac518&list=${M10_PL}&index=12`),
  v('Index Futures - Projected Range & Objectives', 'P5pyzmgZA1s', 18, `https://www.youtube.com/watch?v=P5pyzmgZA1s&list=${M10_PL}&index=13`),
  v('Index Futures - Index Trade Setups', 'yWBxZsbmK1U', 21, `https://www.youtube.com/watch?v=yWBxZsbmK1U&list=${M10_PL}&index=14`),
  v('Stock Trading - Seasonals & Monthly Swings', 'rlTl8QKpqCU', 21, `https://www.youtube.com/watch?v=rlTl8QKpqCU&list=${M10_PL}&index=15`),
  v('Stock Trading - Building Buy Watchlists', 'rcO8-nb3S0Q', 21, `https://www.youtube.com/watch?v=rcO8-nb3S0Q&list=${M10_PL}&index=16`),
  v('Stock Trading - Building Sell Watchlists', 'dH381VCOVl0', 14, `https://www.youtube.com/watch?v=dH381VCOVl0&list=${M10_PL}&index=17`),
  v('Stock Trading - Using Options', 'cv-fwKKXrwQ', 36, `https://www.youtube.com/watch?v=cv-fwKKXrwQ&list=${M10_PL}&index=18`),
  v('Importance Of Multi-Asset Analysis', 'gs3KMgz84yc', 27, `https://www.youtube.com/watch?v=gs3KMgz84yc&list=${M10_PL}&index=19`),
]

const monthEleven: IctVideo[] = [
  v('Commodity Mega-Trades', 'u5S6Zt1ZIpA', 40),
  v('Forex & Currency Mega-Trades', 'CxwFON8MLB0', 23),
  v('Stock Mega-Trades', 'kny8Kpisvoc', 53),
  v('Bond Mega-Trades', 'At43V93rnDQ', 44),
]

const monthTwelve: IctVideo[] = [
  v('Long Term Top Down Analysis', 'eIdnsgq-G7A', 54),
  v('Intermediate Term Top Down Analysis', 'Ad-votrg6WQ', 49, `https://www.youtube.com/watch?v=Ad-votrg6WQ&list=${M12_PL}&index=2`),
  v('Short Term Top Down Analysis', '3B7Reg2Yiqs', 33, `https://www.youtube.com/watch?v=3B7Reg2Yiqs&list=${M12_PL}&index=3`),
  v('Intraday Top Down Analysis', 'Oec_0NM_OeY', 66, `https://www.youtube.com/watch?v=Oec_0NM_OeY&list=${M12_PL}&index=4`),
]

const YEAR_TWO_IDS = [
  'kt6V4ai60fI',
  'tmeCWULSTHc',
  'nQfHZ2DEJ8c',
  'L-ReMHiavPM',
  'N29ZJ-o31xs',
  'Bkt8B3kLATQ',
  'G8-z91acgG4',
  '7rbV8aWkcqY',
  'iZLXnNiZm_s',
  'S9ORTYmXwdE',
  'Sqw2bww93Zo',
  '8GkQfdAXZP0',
  'tpPtItWqmlg',
  'NUdu1n-ML98',
  'tGxuitjtO88',
  'EpGQnhjXBq8',
  '5WIqHJDQ_p4',
  'eai0nHhAC8w',
  'IEa1N0rTtbc',
  'Q6GFu8-Z4rY',
  'kmVXVJE08eQ',
  'QKc_i90chVg',
  'TV9TfwHXuqs',
  'nv0ey5UyOmY',
  'CnTXwAuDi9Y',
  'k26euOG6zAk',
  'gLK4Qm6jte8',
  'j0Z2EbuJXGU',
  'QkokVv0owSE',
  'CL94EnGqB4Q',
  'OYNpIeu9czw',
  'hzoMJQlEv5M',
  '8z6My18WZqA',
  't8flQP5jy-Q',
  'MdYrslpUezU',
  'pWnMpdN_g98',
  'HuZurY0ghDI',
  '36184dDAqtM',
  'yFpHbBnsK_c',
  'koN1ge8bewI',
  '2XhDi5GoNUI',
]

const mentorship2022: IctVideo[] = YEAR_TWO_IDS.map((id, i) => ({
  title: i === 0 ? 'ICT Mentorship 2022 Introduction' : `2022 ICT Mentorship - Episode ${String(i).padStart(2, '0')}`,
  youtubeId: id,
  url: `https://www.youtube.com/watch?v=${id}&list=${M22_PL}&index=${i + 1}`,
}))

export const ICT_PARTS: IctPart[] = [
  {
    title: 'Foundation',
    description: 'Where to start — the mindset behind the strategy and what to realistically expect from your first year of trading.',
    tags: ['Getting Started', 'Expectations'],
    sections: [
      {
        name: 'Trading Expectations',
        videos: [
          v('Real Money Real Results - First Year Trading Expectations', 'Fp1VZ0PKYBs', 10),
          v('Real Money Real Results - First Year Trading Expectations Part 2 of 3', 'b5SMir6bkP8', 14),
          v('Real Money Real Results - First Year Trading Expectations Part 3 of 3', 'qXPZB_H6tVo', 65),
        ],
      },
    ],
  },
  {
    title: 'Core',
    description:
      'The complete 2016 Premium Mentorship Core Content — 115 lectures across 12 months: order blocks, fair value gaps, liquidity, IPDA data ranges, day trading, swing trading, bonds, index futures and top-down analysis.',
    tags: ['2016 Core Content', 'Order Blocks', 'Fair Value Gaps', 'Liquidity', 'IPDA', 'Day Trading'],
    sections: [
      { name: 'Month 1', videos: monthOne },
      { name: 'Month 2', videos: monthTwo },
      { name: 'Month 3', videos: monthThree },
      { name: 'Month 4', videos: monthFour },
      { name: 'Month 5', videos: monthFive },
      { name: 'Month 6', videos: monthSix },
      { name: 'Month 7', videos: monthSeven },
      { name: 'Month 8', videos: monthEight },
      { name: 'Month 9', videos: monthNine },
      { name: 'Month 10', videos: monthTen },
      { name: 'Month 11', videos: monthEleven },
      { name: 'Month 12', videos: monthTwelve },
    ],
  },
  {
    title: 'Advanced Concepts',
    description: 'Precision tools — micro market structure and the algorithmic theory behind price delivery.',
    tags: ['Micro Structure', 'Algorithmic Theory'],
    sections: [
      {
        name: 'Micro-Market Structure',
        videos: [
          v('Micro-Market Structure - Part 1', 'q0AxUH5W5FU', 40),
          v('Micro-Market Structure - Part 2', '9_qyz3TNcJU', 45),
        ],
      },
      {
        name: 'Algorithmic Theory',
        videos: [v('ICT Price Action Model 5 - Algorithmic Theory', '2fgXDt3T3XE', 48)],
      },
    ],
  },
  {
    title: 'Supplementary',
    description: 'Modern ICT models and time-based concepts — Silver Bullet, T.G.I.F., Venom, Judas Swing, Time Macros and opening gaps.',
    tags: ['Silver Bullet', 'Venom Model', 'Time Macros', 'Judas Swing'],
    sections: [
      {
        name: 'Trading Models',
        videos: [
          v('2023 ICT Mentorship - ICT Silver Bullet Time Based Trading Model', 'tRq1hyGGtl4', 35),
          v('ICT Mentorship 2023 - T.G.I.F. Setup', 'wTR-vhOdMgo', 40),
          v('ICT Mentorship 2023 - One Trading Setup For Life', 'vuBRMFhFZAY', 48),
          v('2025 Lecture Series - ICT Venom Model Tutorial', '7wL2oyebbvU', 43),
          v('ICT Forex - Understanding The ICT Judas Swing', 'xJMbva8SjzE', 30),
        ],
      },
      {
        name: 'Time & Order Flow',
        videos: [
          v('ICT Mentorship 2023 - Algorithmic Price Delivery and Time Macros Intro', 'fXVJnBVizYY', 36),
          v('ICT Mentorship 2023 - High Frequency Trading Algorithmic Entries', 'tjnir-o4rsQ', 45),
          v('ICT Mentorship 2023 - Proper Learning & The Importance Of Journaling', 'FQqwmDJOtxk', 42),
          v('Institutional Market Structure & Standard Deviations With Buyside Liquidity', 'g8bhZReDK-Q', 52),
          v('NWOG - New Week Opening Gap', 'WKKnlIIkBTk', 40),
          v('NWOG - New Week Opening Gap Part 2', 'BM1mqQv-ypk', 38),
          v('NDOG - New Day Opening Gap - Part 1', 'Sh-bDHWNpsk', 34),
        ],
      },
    ],
  },
  {
    title: 'MMXM',
    description: 'The Market Maker Model Expanded — the full 2023 masterclass plus the Model 6 and Model 7 Charter series.',
    tags: ['MMXM', 'Model 6', 'Model 7'],
    sections: [
      {
        name: 'Market Maker Model',
        videos: [v('ICT Mentorship 2023 - Market Maker Models', 'iKsIbUblSWM', 59)],
      },
      {
        name: 'Model 6',
        videos: [
          v('ICT Charter Price Action Model 6 - Amplified Lesson', 'fAcnhdaowME', 43),
          v('ICT Charter Price Action Model 6 - Algorithmic Theory', 'beTnmkbuUjg', 31),
          v('ICT Charter Price Action Model 6 - Universal Trading Model', 'BMYrtYMisnA', 55),
          v('ICT Charter Price Action Model 6.2 - Amplified Lesson', 'V0TFp7AvZqw', 40),
          v('ICT Charter Price Action Model 6.3 - Supplementary Lesson', '5FTMSC4kLZM', 42),
        ],
      },
      {
        name: 'Model 7',
        videos: [
          v('ICT Charter Price Action Model 7 - Universal Trading Model', '_7oZZ2bhEGU', 92),
          v('ICT Charter Price Action Model 7 - Supplementary Lesson', 'oheyS8MUqno', 41),
        ],
      },
    ],
  },
  {
    title: 'Mentorship 2022',
    description: 'The 2022 ICT Mentorship — intro plus all 40 episodes in order: order blocks, fair value gaps, liquidity and the daily trading model as taught that year.',
    tags: ['2022 Mentorship', 'Order Blocks', 'FVG', 'Liquidity'],
    sections: [{ name: 'Episodes', videos: mentorship2022 }],
  },
]

export const ICT_CHANNEL_URL = 'https://www.youtube.com/@InnerCircleTrader'

export function allVideos(parts: IctPart[] = ICT_PARTS): IctVideo[] {
  return parts.flatMap((p) => p.sections.flatMap((s) => s.videos))
}

export function videoUrl(video: IctVideo): string {
  return video.url ?? `https://www.youtube.com/watch?v=${video.youtubeId}`
}

export const EMBED_BLOCKED: ReadonlySet<string> = new Set([
  'b5SMir6bkP8', 'qXPZB_H6tVo', 'XwYYWBttWro', 'Fp1VZ0PKYBs', '0LhteuLVuDU', 'qC0LogyIk2I', 'B7_cjybYQ0g',
  'YuefjnUKQdM', 'pctqB3UD6dk', 'vWDElb65YHg', 'pFdW8wdR9sQ', 'SiVmoeyOWZE', '22XkhpJR5eA', 'mjVHmE1gVMg',
  'Zsg8IeBtfu0', 'K4LtfujVpJs', 'bftKgceXqYo', 'cRbPS3uxkj4', 'pv2-R-STviA', 'UF5J0nEBc0E', 'PQkcFbr61FI',
  'MJwWUd_FM-k', 'o8NfSK-pUlE', 'w8lbrvZXUVY', '6oQVb0zVxMM', 'PIYh0CxoY9c', 'FOUzW0QmsfI', 'UrS-mtGHtAA',
  't2VNzJZ4hK4', 'oALYX0HCSYw', 'GuycI8XubgE', '9kabTfUEVKg', 'glu98jAH8vE', 'X5pQjfkAUCI', 'shPGUz9pU-A',
  'npL3ZXJ5zOU', 'Gnw54f9v6SA', 'HTQgH11W37o', 'FgacYSN9QEo', 'Xae0VrbkyFk', 'owq30ATPU5s', 'n7SPAK_tpN8',
  'BkmZgjuYREU', 'xRjKtUEKkSE', 'vqtA1S9JH34', 'LRKtiysz4nA', 'z-7ypchAMDE', 'w6VlX-rsTUs', 'N8_8tEw2_44',
  '6Sp-pr3yCkc', 'crPpMwgwa7k', 'O2Sio7opKxo', 'pwO-E-OOH5k', 'Vb6ueaPqut0', 'Y1oxwc354oo', 'vb_Yc-gCBfU',
  'WDattjFvNBc', 'okN5p701T7Y', 'Xs1i0aIeTME', 'g--tikwaupk', 'osRUnIpGIJ0', '4i_hnoEk6lw', 'soY9zX3gt2U',
  'mQA8jCem9d0', 'hbE8S5FSdtQ', 'YV4fEF4d2wA', 'y0lVKWLsZeM', 'O69iFqP1j7o', 'jvc105qaCJs', 'JAjL7rUX2Iw',
  'LBlK6JB0QS0', '-cXnnHjy9s0', 'VL4YLTRerHY', 'wFjeUzJys7w', 'nI1AMOC1pro', '_2nUKLAD9ig', 'Hoo_wTMgdcY',
  'JKzEhfwV1dY', 'eU8WcUftUtY', 'stK2gNqhLaM', '_TNhWRPa6GA', '5Z_3NbclMSY', 'zanmou0ic5U', 'km0haQkTalc',
  'g7jchu4g31c', '1MnfiqKx5Uo', 'KrGTimL3YRQ', 'OVfn-gDk2dE', 'cqf8nH54bb8', '-oMtfDvc18Y', '9H4iaaQXV5Y',
  'ygtvWKyOzHQ', 'R2NjnYozhdw', 'qRYkTWePXF0', 'WsolkBzpDOQ', 'CGbSpa_9Z9Y', 'JpV-J31mxhg', 'RgpxhuVp5Xg',
  'S0ouOvtjV2I', 'ORbtHOUzAIM', 'wWCKTEhVp2o', 'qZg_5bac518', 'P5pyzmgZA1s', 'yWBxZsbmK1U', 'dH381VCOVl0',
  'rcO8-nb3S0Q', 'rlTl8QKpqCU', 'cv-fwKKXrwQ', 'gs3KMgz84yc', 'u5S6Zt1ZIpA', 'CxwFON8MLB0', 'kny8Kpisvoc',
  'eIdnsgq-G7A', 'Ad-votrg6WQ', 'At43V93rnDQ', '3B7Reg2Yiqs', 'Oec_0NM_OeY', 'q0AxUH5W5FU', 'wTR-vhOdMgo',
  '7wL2oyebbvU', 'xJMbva8SjzE', 'fXVJnBVizYY', 'FQqwmDJOtxk', 'g8bhZReDK-Q', 'Sh-bDHWNpsk', 'BM1mqQv-ypk',
  'iKsIbUblSWM', 'WKKnlIIkBTk', 'iZLXnNiZm_s', 'S9ORTYmXwdE', 'Sqw2bww93Zo', '8GkQfdAXZP0', 'tpPtItWqmlg',
  'tGxuitjtO88', '5WIqHJDQ_p4', 'EpGQnhjXBq8', 'eai0nHhAC8w', 'IEa1N0rTtbc', 'Q6GFu8-Z4rY', 'QKc_i90chVg',
  'nv0ey5UyOmY', 'CnTXwAuDi9Y', 'k26euOG6zAk', 'gLK4Qm6jte8', 'j0Z2EbuJXGU', 'CL94EnGqB4Q', 'QkokVv0owSE',
  'OYNpIeu9czw', 'hzoMJQlEv5M', '8z6My18WZqA', 't8flQP5jy-Q', 'MdYrslpUezU', 'TV9TfwHXuqs', 'pWnMpdN_g98',
  'HuZurY0ghDI', '36184dDAqtM', 'yFpHbBnsK_c', 'koN1ge8bewI', '2XhDi5GoNUI', '0juYnbKays',
])

export function isEmbeddable(video: IctVideo): boolean {
  return !EMBED_BLOCKED.has(video.youtubeId)
}