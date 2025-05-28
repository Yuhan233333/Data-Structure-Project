const app = Vue.createApp({
    data() {
        return {
            places: [],
            searchQuery: '',
            activeType: '',
            sortBy: 'rating',
            types: []
        }
    },
    computed: {
        filteredPlaces() {
            let result = this.places;
            if (this.activeType) {
                result = result.filter(p => p.type === this.activeType);
            }
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                result = result.filter(p => p.name.toLowerCase().includes(q) || (p.keywords && p.keywords.includes(q)));
            }
            if (this.sortBy === 'rating') {
                result = result.sort((a, b) => b.rating - a.rating);
            } else if (this.sortBy === 'popularity') {
                result = result.sort((a, b) => b.popularity - a.popularity);
            }
            return result;
        }
    },
    methods: {
        fetchPlaces() {
            let url = `/api/places?query=${encodeURIComponent(this.searchQuery)}&type=${encodeURIComponent(this.activeType)}&sort=${this.sortBy}`;
            fetch(url)
                .then(res => res.json())
                .then(data => {
                    this.places = data;
                    this.types = [...new Set(this.places.map(p => p.type))];
                });
        },
        filterByType(type) {
            this.activeType = type;
            this.fetchPlaces();
        },
        sortPlaces(sort) {
            this.sortBy = sort;
            this.fetchPlaces();
        }
    },
    mounted() {
        this.fetchPlaces();
    }
});
app.mount('#app'); 