package com.frameworkbench;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.module.blackbird.BlackbirdModule;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import java.util.stream.IntStream;
import java.util.List;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class BenchmarkApplicationTest {
    @LocalServerPort
    int port;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void blackbirdIsRegisteredWithTheApplicationMapper() {
        assertThat(objectMapper.registeredModules()).anyMatch(module -> module instanceof BlackbirdModule);
    }

    @Test
    void endpointsReturnExpectedResponses() {
        RestClient client = RestClient.create("http://localhost:" + port);
        assertResponse(client, "/health", "text/plain;charset=UTF-8", "OK");
        assertResponse(client, "/plaintext", "text/plain;charset=UTF-8", "Hello, World!");
        assertResponse(client, "/json", "application/json", "{\"message\":\"Hello, World!\"}");
    }

    @Test
    void workloadEndpointsReturnExpectedData() {
        RestClient client = RestClient.create("http://localhost:" + port);
        String expected = IntStream.rangeClosed(1, 100)
                .mapToObj(id -> "{\"id\":" + id + ",\"name\":\"item-" + id + "\",\"value\":" + id * 10 + "}")
                .collect(java.util.stream.Collectors.joining(",", "[", "]"));
        assertResponse(client, "/json-large", "application/json", expected);
        List<Integer> numbers = IntStream.rangeClosed(1, 1000).boxed().toList();
        ResponseEntity<String> response = client.post().uri("/aggregate").contentType(MediaType.APPLICATION_JSON)
                .body(new BenchmarkApplication.AggregateInput(numbers)).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatusCode.valueOf(200));
        assertThat(response.getBody()).isEqualTo("{\"count\":1000,\"sum\":500500,\"min\":1,\"max\":1000}");
    }

    private void assertResponse(RestClient client, String path, String contentType, String body) {
        ResponseEntity<String> response = client.get().uri(path).retrieve().toEntity(String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatusCode.valueOf(200));
        assertThat(response.getHeaders().getFirst("Content-Type")).isEqualToIgnoringCase(contentType);
        assertThat(response.getBody()).isEqualTo(body);
    }
}
