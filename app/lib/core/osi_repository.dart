import 'api_client.dart';

// Онбординг председателя (onboarding-unified.md §0, срез R2/REQ-137/143): ОСИ → дом →
// квартиры → жители. Все эндпоинты требуют роль CHAIRMAN активной ОСИ (chairmanContext на
// сервере), КРОМЕ createOsi — тот доступен любому вошедшему (создатель сам становится
// CHAIRMAN, Q-051).

class Building {
  final String id;
  final String address;
  final int? apartmentsCount;
  Building({required this.id, required this.address, this.apartmentsCount});

  factory Building.fromJson(Map<String, dynamic> json) => Building(
        id: ApiJson.asNonEmptyString(json['id']),
        address: ApiJson.asString(json['address']),
        apartmentsCount: ApiJson.asNullableInt(json['apartmentsCount']),
      );
}

class Occupant {
  final String id;
  final String fullName;
  final String? phone;
  final String? email;

  Occupant({
    required this.id,
    required this.fullName,
    this.phone,
    this.email,
  });

  factory Occupant.fromJson(Map<String, dynamic> json) {
    final user = ApiJson.asNullableMap(json['user']);
    return Occupant(
      id: ApiJson.asNonEmptyString(json['id']),
      fullName: ApiJson.asString(json['fullName']),
      phone: ApiJson.asNullableString(json['phone']),
      email: ApiJson.asNullableString(user?['email']),
    );
  }
}

class Apartment {
  final String id;
  final String number;
  final double? area;
  final int? rooms;
  final List<Occupant> occupants;

  Apartment({
    required this.id,
    required this.number,
    this.area,
    this.rooms,
    this.occupants = const [],
  });

  factory Apartment.fromJson(Map<String, dynamic> json) {
    return Apartment(
      id: ApiJson.asNonEmptyString(json['id']),
      number: ApiJson.asString(json['number']),
      area: ApiJson.asNullableDouble(json['area'], allowString: true),
      rooms: ApiJson.asNullableInt(json['rooms'], allowString: true),
      occupants: ApiJson.asMapList(json['occupants'], allowMissing: true)
          .map(Occupant.fromJson)
          .toList(),
    );
  }
}

// Заявка на подключение к ОСИ (REQ-151..154, docs/specs/osi-join-request.md — портировано с
// веба, web/src/lib/onboarding/joinRequest.ts). Osi вне RLS — поиск доступен любому вошедшему.

class OsiSearchResult {
  final String id;
  final String name;
  final String? address;
  OsiSearchResult({required this.id, required this.name, this.address});

  factory OsiSearchResult.fromJson(Map<String, dynamic> json) => OsiSearchResult(
        id: ApiJson.asNonEmptyString(json['id']),
        name: ApiJson.asString(json['name']),
        address: ApiJson.asNullableString(json['address']),
      );
}

// Моя заявка (GET /api/osi/join-request) — osi вложена сервером для отображения статуса.
class MyJoinRequest {
  final String id;
  final String? note;
  final String osiName;
  final String? osiAddress;
  MyJoinRequest({required this.id, this.note, required this.osiName, this.osiAddress});

  factory MyJoinRequest.fromJson(Map<String, dynamic> json) {
    final osi = ApiJson.asMap(json['osi']);
    return MyJoinRequest(
      id: ApiJson.asNonEmptyString(json['id']),
      note: ApiJson.asNullableString(json['note']),
      osiName: ApiJson.asString(osi['name']),
      osiAddress: ApiJson.asNullableString(osi['address']),
    );
  }
}

// Заявка со стороны председателя (GET /api/osi/join-requests) — контакт заявителя (телефон/
// email из User), сама привязку к квартире не делает (REQ-153, addResident по-прежнему вручную).
class PendingJoinRequest {
  final String id;
  final String? note;
  final String? email;
  final String? phone;
  final String? fullName;
  PendingJoinRequest({required this.id, this.note, this.email, this.phone, this.fullName});

  factory PendingJoinRequest.fromJson(Map<String, dynamic> json) {
    final user = ApiJson.asNullableMap(json['user']);
    final occupant = ApiJson.asNullableMap(user?['occupant']);
    return PendingJoinRequest(
      id: ApiJson.asNonEmptyString(json['id']),
      note: ApiJson.asNullableString(json['note']),
      email: ApiJson.asNullableString(user?['email']),
      phone: ApiJson.asNullableString(user?['phone']),
      fullName: ApiJson.asNullableString(occupant?['fullName']) ??
          ApiJson.asNullableString(user?['fullName']),
    );
  }
}

class OsiRepository {
  OsiRepository._();
  static final OsiRepository instance = OsiRepository._();

  final _api = ApiClient.instance;

  // Создатель становится CHAIRMAN, новая ОСИ — активная (Q-051). Возвращает activeOsiId —
  // вызывающий обязан перечитать AuthRepository.me() после этого, чтобы обновить AuthUser.
  Future<String> createOsi({required String name, String? bin, String? address}) async {
    final data = ApiJson.asMap(await _api.post('/api/osi', body: {
      'name': name,
      if (bin != null && bin.isNotEmpty) 'bin': bin,
      if (address != null && address.isNotEmpty) 'address': address,
    }));
    return ApiJson.asNonEmptyString(data['activeOsiId']);
  }

  Future<Building> createBuilding({required String address, int? apartmentsCount}) async {
    final data = ApiJson.asMap(await _api.post('/api/buildings', body: {
      'address': address,
      if (apartmentsCount != null) 'apartmentsCount': apartmentsCount,
    }));
    return Building.fromJson(ApiJson.asMap(data['building']));
  }

  Future<List<Building>> listBuildings() async {
    final data = ApiJson.asMap(await _api.get('/api/buildings'));
    return ApiJson.asMapList(data['buildings']).map(Building.fromJson).toList();
  }

  Future<List<Apartment>> listApartments(String buildingId) async {
    final data = ApiJson.asMap(
      await _api.get('/api/apartments?buildingId=${Uri.encodeQueryComponent(buildingId)}'),
    );
    return ApiJson.asMapList(data['apartments'])
        .map(Apartment.fromJson)
        .toList();
  }

  Future<Apartment> createApartment({required String buildingId, required String number}) async {
    final data = ApiJson.asMap(await _api.post('/api/apartments', body: {
      'buildingId': buildingId,
      'number': number,
    }));
    return Apartment.fromJson(ApiJson.asMap(data['apartment']));
  }

  // Телефон И/ИЛИ email — минимум один (ревизия REQ-013). Если житель уже сам
  // зарегистрировался тем же контактом — сервер подхватывает существующий аккаунт (upsert),
  // не создаёт дубль.
  Future<void> addResident({
    required String apartmentId,
    required String fullName,
    String? phone,
    String? email,
  }) async {
    await _api.post('/api/residents', body: {
      'apartmentId': apartmentId,
      'fullName': fullName,
      if (phone != null && phone.isNotEmpty) 'phone': phone,
      if (email != null && email.isNotEmpty) 'email': email,
    });
  }

  // REQ-151: найти ОСИ по названию/адресу — доступно любому вошедшему, без роли/tenant.
  Future<List<OsiSearchResult>> searchOsi(String query) async {
    final data = ApiJson.asMap(
      await _api.get('/api/osi/search?q=${Uri.encodeQueryComponent(query)}'),
    );
    return ApiJson.asMapList(data['results'])
        .map(OsiSearchResult.fromJson)
        .toList();
  }

  // Мои активные заявки (REQ-154) — статус вместо повторного поиска, если уже отправлена.
  Future<List<MyJoinRequest>> myJoinRequests() async {
    final data = ApiJson.asMap(await _api.get('/api/osi/join-request'));
    return ApiJson.asMapList(data['requests'])
        .map(MyJoinRequest.fromJson)
        .toList();
  }

  // Возвращает id созданной/обновлённой заявки (review 2026-07-22: раньше вызывающий сам
  // генерировал фейковый id для локального состояния — «Отменить» до перезагрузки экрана
  // слало DELETE на несуществующий id и падало с 404).
  Future<String> submitJoinRequest({required String osiId, String? note}) async {
    final data = ApiJson.asMap(await _api.post('/api/osi/join-request', body: {
      'osiId': osiId,
      if (note != null && note.isNotEmpty) 'note': note,
    }));
    return ApiJson.asNonEmptyString(ApiJson.asMap(data['request'])['id']);
  }

  Future<void> cancelJoinRequest(String id) async {
    await _api.delete('/api/osi/join-request/${Uri.encodeComponent(id)}');
  }

  // REQ-153: заявки своей ОСИ — требует роль CHAIRMAN активной ОСИ (chairmanContext на сервере).
  Future<List<PendingJoinRequest>> listOsiJoinRequests() async {
    final data = ApiJson.asMap(await _api.get('/api/osi/join-requests'));
    return ApiJson.asMapList(data['requests'])
        .map(PendingJoinRequest.fromJson)
        .toList();
  }

  Future<void> resolveJoinRequest(String id) async {
    await _api.post('/api/osi/join-requests/${Uri.encodeComponent(id)}/resolve');
  }
}
