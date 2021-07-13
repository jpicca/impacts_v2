var constants = {
    nsims: 10000,
    percDict: {
        '0.1': 'ten',
        '0.5': 'med',
        '0.9': 'ninety'
    },
    impDict: {
        'pop': 'people',
        'hosp': 'hospitals',
        'mob': 'mobile homes',
        'pow': 'substations'
    },
    height: $(window).height(),
    width: $(window).width()
}

//              //
// ** Colors ** //
//              //

export const customReds = d3.scaleLinear().range(["rgb(255,245,240)", "rgb(214,37,34)"])

export const fillColorDict = {
    'population': {
        '0.1': d3.scaleSequential([1,100], customReds),
        '0.5': d3.scaleSequential([1,1000], customReds),
        '0.9': d3.scaleSequential([1,10000], customReds)
    },
    'hospitals': {
        '0.1': d3.scaleSequential([1,2], customReds),
        '0.5': d3.scaleSequential([1,3], customReds),
        '0.9': d3.scaleSequential([1,5], customReds)
    },
    'psubstations': {
        '0.1': d3.scaleSequential([1,3], customReds),
        '0.5': d3.scaleSequential([1,5], customReds),
        '0.9': d3.scaleSequential([1,10], customReds)
    },
    'mobilehomes': {
        '0.1': d3.scaleSequential([1,50], customReds),
        '0.5': d3.scaleSequential([1,100], customReds),
        '0.9': d3.scaleSequential([1,250], customReds)
    }
}

export const fillColorTime = {
    'population': {
        '0.1': d3.scaleSequential([0,100], customReds),
        '0.5': d3.scaleSequential([0,1000], customReds),
        '0.9': d3.scaleSequential([0,10000], customReds)
    },
    'hospitals': {
        '0.1': d3.scaleSequential([0,2], customReds),
        '0.5': d3.scaleSequential([0,3], customReds),
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
    }
}

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