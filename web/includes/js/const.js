var constants = {
    simdataroot: '../web/includes/data/',
    geodataroot: '../web/includes/geo/',
    nsims: 10000,
    percDict: {
        '0.1': 'ten',
        '0.5': 'med',
        '0.9': 'ninety'
    },
    ratDict: {
        'all': 0,
        'sig': 2,
        'vio': 4
    },
    impDict: {
        'pop': 'population',
        'hosp': 'hospitals',
        'mob': 'mobilehomes',
        'pow': 'psubstations',
        'sco': 'schools'
    },
    height: $(window).height(),
    width: $(window).width(),
    date: 20110427
    // date: '20210428'
}

//              //
// ** Colors ** //
//              //

export const customReds = d3.scaleLinear().range(["rgb(255,245,240)", "rgb(214,37,34)"])

export function fillColor(impact,perc,level) {
    let fillColor = {
        'FEMA': {
            'population': {
                '0.1': [0,250000],
                '0.5': [0,250000],
                '0.9': [0,250000]
            },
            'hospitals': {
                '0.1': [0,10],
                '0.5': [0,10],
                '0.9': [0,10]
            },
            'psubstations': {
                '0.1': [0,20],
                '0.5': [0,20],
                '0.9': [0,20]
            },
            'mobilehomes': {
                '0.1': [0,1000],
                '0.5': [0,1000],
                '0.9': [0,1000]
            },
            'schools': {
                '0.1': [0,100],
                '0.5': [0,100],
                '0.9': [0,100]
            }
        },
        'State': {
            'population': {
                '0.1': [0,40000],
                '0.5': [0,40000],
                '0.9': [0,40000]
            },
            'hospitals': {
                '0.1': [0,4],
                '0.5': [0,4],
                '0.9': [0,4]
            },
            'psubstations': {
                '0.1': [0,6],
                '0.5': [0,6],
                '0.9': [0,6]
            },
            'mobilehomes': {
                '0.1': [0,200],
                '0.5': [0,200],
                '0.9': [0,200]
            },
            'schools': {
                '0.1': [0,20],
                '0.5': [0,20],
                '0.9': [0,20]
            }
        },
        'CWA': {
            'population': {
                '0.1': [0,20000],
                '0.5': [0,20000],
                '0.9': [0,20000]
            },
            'hospitals': {
                '0.1': [0,3],
                '0.5': [0,3],
                '0.9': [0,3]
            },
            'psubstations': {
                '0.1': [0,4],
                '0.5': [0,4],
                '0.9': [0,4]
            },
            'mobilehomes': {
                '0.1': [0,100],
                '0.5': [0,100],
                '0.9': [0,100]
            },
            'schools': {
                '0.1': [0,10],
                '0.5': [0,10],
                '0.9': [0,10]
            }
        }
    }

    return d3.scaleSequential(fillColor[level][impact][perc], customReds)
}

export const fillColorDict = {
    'population': {
        '0.1': d3.scaleSequential([0,1000], customReds),
        '0.5': d3.scaleSequential([0,10000], customReds),
        '0.9': d3.scaleSequential([0,100000], customReds)
    },
    'hospitals': {
        '0.1': d3.scaleSequential([0,1], customReds),
        '0.5': d3.scaleSequential([0,2], customReds),
        '0.9': d3.scaleSequential([0,5], customReds)
    },
    'psubstations': {
        '0.1': d3.scaleSequential([0,3], customReds),
        '0.5': d3.scaleSequential([0,5], customReds),
        '0.9': d3.scaleSequential([0,10], customReds)
    },
    'mobilehomes': {
        '0.1': d3.scaleSequential([0,50], customReds),
        '0.5': d3.scaleSequential([0,100], customReds),
        '0.9': d3.scaleSequential([0,250], customReds)
    },
    'schools': {
        '0.1': d3.scaleSequential([0,3], customReds),
        '0.5': d3.scaleSequential([0,5], customReds),
        '0.9': d3.scaleSequential([0,50], customReds)
    }
}

// export const fillColorTime = {
//     'population': {
//         '0.1': d3.scaleSequential([0,100], customReds),
//         '0.5': d3.scaleSequential([0,1000], customReds),
//         '0.9': d3.scaleSequential([0,10000], customReds)
//     },
//     'hospitals': {
//         '0.1': d3.scaleSequential([0,2], customReds),
//         '0.5': d3.scaleSequential([0,3], customReds),
//         '0.9': d3.scaleSequential([0,5], customReds)
//     },
//     'psubstations': {
//         '0.1': d3.scaleSequential([0,3], customReds),
//         '0.5': d3.scaleSequential([0,5], customReds),
//         '0.9': d3.scaleSequential([0,10], customReds)
//     },
//     'mobilehomes': {
//         '0.1': d3.scaleSequential([0,50], customReds),
//         '0.5': d3.scaleSequential([0,100], customReds),
//         '0.9': d3.scaleSequential([0,250], customReds)
//     }
// }

export const locCodes = {
    'Alabama': 'AL',
    'Arizona': 'AZ',
    'Arkansas': 'AR',
    'California': 'CA',
    'Colorado': 'CO',
    'Connecticut': 'CT',
    'Delaware': 'DE',
    'District of Columbia': 'DC',
    'Florida': 'FL',
    'Georgia': 'GA',
    'Idaho': 'ID',
    'Illinois': 'IL',
    'Indiana': 'IN',
    'Iowa': 'IA',
    'Kansas': 'KS',
    'Kentucky': 'KY',
    'Louisiana': 'LA',
    'Maine': 'ME',
    'Maryland': 'MD',
    'Massachusetts': 'MA',
    'Michigan': 'MI',
    'Minnesota': 'MN',
    'Mississippi': 'MS',
    'Missouri': 'MO',
    'Montana': 'MT',
    'Nebraska': 'NE',
    'Nevada': 'NV',
    'New Hampshire': 'NH',
    'New Jersey': 'NJ',
    'New Mexico': 'NM',
    'New York': 'NY',
    'North Carolina': 'NC',
    'North Dakota': 'ND',
    'Ohio': 'OH',
    'Oklahoma': 'OK',
    'Oregon': 'OR',
    'Pennsylvania': 'PA',
    'Rhode Island': 'RI',
    'South Carolina': 'SC',
    'South Dakota': 'SD',
    'Tennessee': 'TN',
    'Texas': 'TX',
    'Utah': 'UT',
    'Vermont': 'VT',
    'Virginia': 'VA',
    'Washington': 'WA',
    'West Virginia': 'WV',
    'Wisconsin': 'WI',
    'Wyoming': 'WY'
}

export default constants;