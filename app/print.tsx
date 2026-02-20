      {/* TabBar matching Flutter design */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, tab === 'new' && styles.activeTab]}
          onPress={() => setTab('new')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'new' ? styles.activeTabText : styles.inactiveTabText]}>
            Print Centres
          </Text>
        </TouchableOpacity>
       
        <TouchableOpacity
          style={[styles.tab, tab === 'jobs' && styles.activeTab]}
          onPress={() => setTab('jobs')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, tab === 'jobs' ? styles.activeTabText : styles.inactiveTabText]}>
            My Prints {activeJobs.length > 0 ? `(${activeJobs.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}   {/* ← FIXED: prevents overlapping with TabBar */}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BRAND_GREEN} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={BRAND_GREEN} style={{ marginTop: 40 }} />
        ) : tab === 'new' ? (
          // ... your shops map stays 100% unchanged
        ) : (
          // ... your jobs map stays 100% unchanged
        )}
      </ScrollView> 